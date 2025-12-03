import Agenda from "agenda";
import mongoose from "mongoose";
import User from "../models/expertInformation.js";
import Customer from "../models/customer.js";
import { sendEmail, sendBulkEmail } from "./email.js";
import { sendSms } from "./netgsmService.js";

// Read Mongo connection from env (support both MONGO_URL and MONGO_URI)
let mongoAddress = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
if (typeof mongoAddress === "string") {
  // trim surrounding quotes if present in .env
  mongoAddress = mongoAddress.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}
const dbName = (process.env.DB_NAME || "").replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();

if (!mongoAddress) {
  console.error("FATAL: MONGO_URL / MONGO_URI is not defined. Set MONGO_URL in backend/.env or environment variables.");
  throw new Error("MONGO_URL / MONGO_URI missing");
}

// If DB name provided separately, append if not already present
if (dbName && !/\/[^/]+\?/.test(mongoAddress) && !/\/[^/]+$/.test(mongoAddress)) {
  // attempt to append DB name if the connection string ends with '/' (common in your .env)
  if (mongoAddress.endsWith("/")) {
    mongoAddress = `${mongoAddress}${dbName}`;
  } else {
    mongoAddress = `${mongoAddress}/${dbName}`;
  }
}

console.log("Agenda connecting to Mongo address:", mongoAddress.replace(/\/\/([^:]+):([^@]+)@/, "//$1:*****@"));

const agenda = new Agenda({
  db: { address: mongoAddress, collection: "agendaJobs" },
  processEvery: "30 seconds"
});

// Job: sendEventReminder
agenda.define("sendEventReminder", { priority: "high", concurrency: 3 }, async (job) => {
  const data = job.attrs.data || {};
  const { userId, eventId } = data;

  try {
    if (!userId || !eventId) {
      console.warn("sendEventReminder missing userId/eventId", data);
      return;
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn("sendEventReminder: user not found", userId);
      return;
    }

    const event = (user.events || []).find(e => String(e.id) === String(eventId) || String(e._id) === String(eventId));
    if (!event) {
      console.warn("sendEventReminder: event not found", eventId, "for user", userId);
      return;
    }

    // Check if event is still scheduled (not cancelled)
    if (event.status === "cancelled") {
      console.log(`⏭️  Event cancelled, skipping reminder: ${event.title || event.serviceName}`);
      return;
    }

    const expertName = `${user.information?.name || ''} ${user.information?.surname || ''}`.trim();
    const expertEmail = user.information?.email;
    const expertPhone = user.information?.phone;

    // Collect all recipient emails
    const recipients = new Set();
    if (expertEmail) recipients.add(expertEmail);

    // Process selected clients - handle both object and ID references
    const selectedClients = [];
    const clientIds = []; // Track IDs to fetch phones

    for (const clientRef of (event.selectedClients || [])) {
      let clientData = null;

      // If it's an object with email directly
      if (clientRef && typeof clientRef === 'object' && clientRef.email) {
        clientData = clientRef;
        if (clientRef.id || clientRef._id) {
          clientIds.push(clientRef.id || clientRef._id);
        }
      }
      // If it's an ID, find in user.customers
      else if (clientRef && typeof clientRef === 'string') {
        clientIds.push(clientRef); // It's an ID

        const foundCustomer = (user.customers || []).find(c => {
          const customer = c.customerId || c;
          return String(customer._id || customer.id) === String(clientRef);
        });
        if (foundCustomer) {
          const customer = foundCustomer.customerId || foundCustomer;
          clientData = {
            name: `${customer.name || ''} ${customer.surname || ''}`.trim(),
            email: customer.email
          };
        }
      }

      if (clientData && clientData.email) {
        recipients.add(clientData.email);
        selectedClients.push(clientData);
      }
    }

    const recipientList = Array.from(recipients);
    if (recipientList.length === 0) {
      console.warn("sendEventReminder: no recipient emails for event", eventId);
      // We might still want to send SMS even if no emails, but usually they go together.
      // Continuing to SMS logic...
    }

    // --- EMAIL SENDING ---

    // Send email to expert
    if (expertEmail) {
      const expertEmailTemplate = {
        to: expertEmail,
        subject: `Hatırlatma: ${event.title || event.serviceName} - 2 Saat Kaldı`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .event-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #1f2937; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Etkinlik Hatırlatması</h1>
              </div>
              <div class="content">
                <p>Merhaba ${expertName},</p>
                <p>Yaklaşan etkinliğiniz için bir hatırlatma:</p>
                
                <div class="event-details">
                  <div class="detail-row">
                    <span class="label">Etkinlik:</span>
                    <span class="value">${event.title || event.serviceName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Tarih:</span>
                    <span class="value">${event.date || data.eventDate || ''}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Saat:</span>
                    <span class="value">${event.time || data.eventTime || ''}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Süre:</span>
                    <span class="value">${event.duration || 60} dakika</span>
                  </div>
                  ${event.location ? `
                  <div class="detail-row">
                    <span class="label">Konum:</span>
                    <span class="value">${event.location}</span>
                  </div>
                  ` : ''}
                  ${event.platform ? `
                  <div class="detail-row">
                    <span class="label">Platform:</span>
                    <span class="value">${event.platform}</span>
                  </div>
                  ` : ''}
                  ${selectedClients.length > 0 ? `
                  <div class="detail-row">
                    <span class="label">Katılımcılar:</span>
                    <span class="value">${selectedClients.map(c => c.name).join(', ')}</span>
                  </div>
                  ` : ''}
                  ${event.appointmentNotes ? `
                  <div class="detail-row">
                    <span class="label">Notlar:</span>
                    <span class="value">${event.appointmentNotes}</span>
                  </div>
                  ` : ''}
                </div>
                
                <p><strong>Etkinliğinize 2 saat kaldı!</strong> Lütfen hazırlıklarınızı tamamlayın.</p>
                
                <div class="footer">
                  <p>Bu otomatik bir hatırlatma mesajıdır.</p>
                  <p>Uzmanlio - Danışmanlık Platformu</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await sendEmail(expertEmailTemplate);
      console.log(`✅ Reminder email sent to expert: ${expertEmail}`);
    }

    // Send email to each client
    for (const client of selectedClients) {
      const clientEmailTemplate = {
        to: client.email,
        subject: `Hatırlatma: ${event.title || event.serviceName} - 2 Saat Kaldı`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .event-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #1f2937; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Etkinlik Hatırlatması</h1>
              </div>
              <div class="content">
                <p>Merhaba ${client.name},</p>
                <p>Yaklaşan randevunuz için bir hatırlatma:</p>
                
                <div class="event-details">
                  <div class="detail-row">
                    <span class="label">Danışman:</span>
                    <span class="value">${expertName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Etkinlik:</span>
                    <span class="value">${event.title || event.serviceName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Tarih:</span>
                    <span class="value">${event.date || data.eventDate || ''}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Saat:</span>
                    <span class="value">${event.time || data.eventTime || ''}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Süre:</span>
                    <span class="value">${event.duration || 60} dakika</span>
                  </div>
                  ${event.location ? `
                  <div class="detail-row">
                    <span class="label">Konum:</span>
                    <span class="value">${event.location}</span>
                  </div>
                  ` : ''}
                  ${event.platform ? `
                  <div class="detail-row">
                    <span class="label">Katılım Linki:</span>
                    <span class="value"><a href="${event.platform}">${event.platform}</a></span>
                  </div>
                  ` : ''}
                  ${event.appointmentNotes ? `
                  <div class="detail-row">
                    <span class="label">Notlar:</span>
                    <span class="value">${event.appointmentNotes}</span>
                  </div>
                  ` : ''}
                </div>
                
                <p><strong>Randevunuza 2 saat kaldı!</strong> Lütfen zamanında katılmayı unutmayın.</p>
                
                <div class="footer">
                  <p>Bu otomatik bir hatırlatma mesajıdır.</p>
                  <p>Uzmanlio - Danışmanlık Platformu</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await sendEmail(clientEmailTemplate);
      console.log(`✅ Reminder email sent to client: ${client.email}`);
    }

    console.log(`✅ All reminder emails sent successfully for event: ${event.title || event.serviceName}`);


    // --- SMS SENDING ---
    const joinLink = event.platform || "Link yakında paylaşılacak";

    // 1. Send SMS to Expert
    if (expertPhone) {
      const expertMsg = `Hatırlatma: ${event.serviceName} randevunuz ${event.date} ${event.time}’te. Katılım linki: ${joinLink}`;
      try {
        await sendSms(expertPhone, expertMsg);
        console.log(`✅ Reminder SMS sent to expert: ${expertPhone}`);
      } catch (smsErr) {
        console.error(`❌ Failed to send SMS to expert ${expertPhone}:`, smsErr);
      }
    }

    // 2. Send SMS to Clients
    if (clientIds.length > 0) {
      // Fetch full customer details to get phone numbers
      const customers = await Customer.find({ _id: { $in: clientIds } }).select("phone name");

      for (const customer of customers) {
        if (customer.phone) {
          const clientMsg = `Hatırlatma: ${expertName} ile ${event.serviceName} randevun ${event.date} ${event.time}’te. Katılım linki: ${joinLink}`;
          try {
            await sendSms(customer.phone, clientMsg);
            console.log(`✅ Reminder SMS sent to client: ${customer.name} (${customer.phone})`);
          } catch (smsErr) {
            console.error(`❌ Failed to send SMS to client ${customer.name}:`, smsErr);
          }
        } else {
          console.log(`⚠️ Client ${customer.name} has no phone number, skipping SMS.`);
        }
      }
    }

  } catch (err) {
    console.error("sendEventReminder error:", err?.message || err);
  }
});

/**
 * Schedule a reminder job for an event
 * @param {Object} event - Event object from database
 * @param {String} userId - User ID who owns the event
 * @returns {Promise<String>} - Job ID of the scheduled job
 */
export const scheduleEventReminder = async (event, userId) => {
  try {
    const eventDateTime = parseEventDateTime(event.date, event.time);

    if (!eventDateTime) {
      console.warn(`❌ Invalid event date/time →`, event.date, event.time);
      return null;
    }

    console.log("📅 Parsed Event:", eventDateTime.toISOString());

    const reminderTime = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    console.log("⏰ Reminder At:", reminderTime.toISOString());
    console.log("⏱️ Now:", now.toISOString());

    const jobData = {
      eventId: event.id || event._id,
      userId: userId,
      eventDate: event.date,
      eventTime: event.time
    };

    // If reminder time passed → schedule immediate
    if (reminderTime <= now) {
      console.log(`⚡ Reminder time passed → scheduling immediate job`);

      const job = await agenda.schedule(
        new Date(Date.now() + 10000),
        "sendEventReminder",
        jobData
      );

      return job?.attrs?._id?.toString?.() || null;
    }

    // Normal case
    const job = await agenda.schedule(reminderTime, "sendEventReminder", jobData);
    return job?.attrs?._id?.toString?.() || null;

  } catch (error) {
    console.error(`❌ Error scheduling reminder:`, error);
    return null;
  }
};


/**
 * Update/reschedule a reminder job when event time changes
 * @param {Object} event - Updated event object
 * @param {String} userId - User ID who owns the event
 * @returns {Promise<String>} - New job ID
 */
export const updateEventReminder = async (event, userId) => {
  try {
    // Cancel old job if exists
    if (event.agendaJobId) {
      await cancelEventReminder(event.agendaJobId);
    }

    // Schedule new job
    const newJobId = await scheduleEventReminder(event, userId);
    return newJobId;
  } catch (error) {
    console.error(`❌ Error updating reminder for event ${event.id}:`, error);
    return null;
  }
};

/**
 * Cancel a scheduled reminder job
 * @param {String} jobId - Agenda job ID
 * @returns {Promise<Boolean>} - Success status
 */
export const cancelEventReminder = async (jobId) => {
  try {
    if (!jobId) {
      return false;
    }

    const numRemoved = await agenda.cancel({ _id: jobId });

    if (numRemoved > 0) {
      console.log(`✅ Cancelled reminder job: ${jobId}`);
      return true;
    } else {
      console.warn(`⚠️  Job not found or already executed: ${jobId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error cancelling job ${jobId}:`, error);
    return false;
  }
};

/**
 * Parse event date and time into a Date object
 * @param {String} dateStr - Date string (YYYY-MM-DD or other format)
 * @param {String} timeStr - Time string (HH:MM)
 * @returns {Date|null} - Parsed date or null if invalid
 */
/**
 * Parse event date + time with fixed Turkey timezone (UTC+3)
 */
const parseEventDateTime = (dateStr, timeStr) => {
  try {
    if (!dateStr || !timeStr) return null;

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Force Turkey timezone: UTC+3
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+03:00`;

    const dt = new Date(iso);

    if (isNaN(dt.getTime())) return null;

    return dt;
  } catch (e) {
    console.error("parseEventDateTime error:", e);
    return null;
  }
};



/**
 * Graceful shutdown - stop Agenda when app closes
 */
export const gracefulShutdown = async () => {
  console.log("🛑 Stopping Agenda gracefully...");
  await agenda.stop();
  console.log("✅ Agenda stopped");
};

// Start Agenda
(async function startAgenda() {
  try {
    await agenda.start();
    console.log("✅ Agenda started successfully");

    const graceful = async () => {
      await gracefulShutdown();
      process.exit(0);
    };

    process.on("SIGTERM", graceful);
    process.on("SIGINT", graceful);
  } catch (err) {
    console.error("❌ Agenda start failed:", err?.message || err);
  }
})();

export default agenda;