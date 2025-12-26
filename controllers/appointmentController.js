// import mongoose from "mongoose";
// import { v4 as uuidv4 } from "uuid";
// import User from "../models/expertInformation.js";
// import CustomerAppointments from "../models/customerAppointment.js";
// import calendarSyncService from "../services/calendarSyncService.js";

// // Helper function to find user by ID
// const findUserById = async (userId) => {
//   let user;
//   if (mongoose.Types.ObjectId.isValid(userId)) {
//     user = await User.findById(userId);
//   }
//   if (!user) {
//     user = await User.findOne({
//       $or: [
//         { _id: userId },
//         { id: userId },
//         { userId: userId },
//         { customId: userId }
//       ]
//     });
//   }
//   if (!user) {
//     throw new Error('User not found');
//   }
//   return user;
// };

// export const getAppointments = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId)
//       .populate({
//         path: 'appointments',
//         model: 'CustomerAppointment'
//       }); // Populate the referenced documents

//     if (!user) return res.status(404).json({ error: "User not found" });

//     // Return the populated appointments array
//     const appointments = user.appointments || [];
//     res.json({ appointments });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const createAppointment = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { title, date, time, duration, type, status, clientName, clientEmail, notes, serviceId, packageId, meetingType, eventType, paymentStatus, price, location, meetingLink } = req.body;

//     const user = await findUserById(userId);

//     // Create the independent Appointment document
//     const newAppointment = new CustomerAppointments({
//       id: uuidv4(),
//       title,
//       serviceName: title || "Manual Appointment", // Fallback for title
//       date: date,
//       time: time,
//       duration: duration,
//       status: status || 'pending',
//       meetingType: meetingType || (type === 'online' ? 'online' : ''), // simple mapping attempt
//       eventType: eventType || 'online',
//       notes: notes ? `${notes} \nClient: ${clientName} (${clientEmail})` : `Client: ${clientName} (${clientEmail})`, // Append client info to notes since no client fields
//       providerId: userId,
//       // Add other matching fields
//       serviceId: serviceId,
//       packageId: packageId,
//       paymentStatus: paymentStatus,
//       price: price,
//       location: location,
//       meetingLink: meetingLink
//     });

//     await newAppointment.save();

//     if (!user.appointments) {
//       user.appointments = [];
//     }
//     user.appointments.push(newAppointment._id); // Push ID!
//     await user.save();

//     // Sync to connected calendars
//     const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
//     if (activeProviders.length > 0) {
//       setImmediate(async () => {
//         for (const provider of activeProviders) {
//           try {
//             // Adapted sync call - passing the full document
//             await calendarSyncService.syncAppointmentToProvider(
//               userId,
//               newAppointment.toObject(), // Pass plain object as service likely expects
//               { id: provider._id }
//             );
//           } catch (error) {
//             console.error(`Failed to sync appointment to ${provider.provider}:`, error);
//           }
//         }
//       });
//     }

//     res.json({ appointment: newAppointment, message: "Appointment added successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const updateAppointment = async (req, res) => {
//   try {
//     const { userId, appointmentId } = req.params;
//     const updateData = req.body;

//     // Check if appointment belongs to user (via User.appointments array)
//     const user = await findUserById(userId);
//     const hasAppointment = user.appointments.some(id => id.toString() === appointmentId);

//     // Note: If the ID check fails, we might still want to check if the ProviderID matches?
//     // But adhering to the existing 'ownership' logic is safer.
//     if (!hasAppointment) {
//       // Fallback: Check if the document exists and providerId matches
//       const appt = await CustomerAppointments.findById(appointmentId);
//       if (appt && appt.providerId && appt.providerId.toString() === userId) {
//         // It's valid, maybe just missing from the array (data inconsistency), proceed.
//       } else {
//         return res.status(404).json({ error: "Appointment not found for this user" });
//       }
//     }

//     // Update the Document
//     const appointment = await CustomerAppointments.findByIdAndUpdate(
//       appointmentId,
//       {
//         $set: {
//           // Map fields again
//           serviceName: updateData.title || updateData.serviceName,
//           date: updateData.date,
//           time: updateData.time,
//           duration: updateData.duration,
//           status: updateData.status,
//           meetingType: updateData.meetingType,
//           eventType: updateData.eventType,
//           notes: updateData.notes, // caution: overriding client info if we don't preserve it?
//           // For update, just pass what we get.
//           paymentStatus: updateData.paymentStatus,
//           price: updateData.price,
//           location: updateData.location,
//           meetingLink: updateData.meetingLink
//         }
//       },
//       { new: true } // Return updated
//     );

//     if (!appointment) return res.status(404).json({ error: "Appointment not found" });

//     // Sync
//     const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
//     if (activeProviders.length > 0) {
//       setImmediate(async () => {
//         for (const provider of activeProviders) {
//           try {
//             await calendarSyncService.syncAppointmentToProvider(
//               userId,
//               appointment.toObject(),
//               { id: provider._id }
//             );
//           } catch (error) {
//             console.error(`Failed to sync updated appointment to ${provider.provider}:`, error);
//           }
//         }
//       });
//     }

//     res.json({
//       appointment,
//       message: "Appointment updated successfully"
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const deleteAppointment = async (req, res) => {
//   try {
//     const { userId, appointmentId } = req.params;
//     const user = await findUserById(userId);

//     // Remove from User array
//     const initialLength = user.appointments.length;
//     user.appointments = user.appointments.filter(id => id.toString() !== appointmentId);
//     // If we didn't find it in the array, maybe check DB anyway for cleanup?

//     await user.save();

//     // Delete the Document
//     await CustomerAppointments.findByIdAndDelete(appointmentId);

//     // Sync deletion
//     const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
//     if (activeProviders.length > 0) {
//       setImmediate(async () => {
//         for (const provider of activeProviders) {
//           try {
//             await calendarSyncService.deleteAppointmentFromProvider(
//               userId,
//               appointmentId,
//               { id: provider._id }
//             );
//           } catch (error) {
//             console.error(`Failed to delete appointment from ${provider.provider}:`, error);
//           }
//         }
//       });
//     }

//     res.json({ message: "Appointment deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
