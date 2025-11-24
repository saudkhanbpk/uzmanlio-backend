// emailTemplates.js - Email templates for different booking types

/**
 * Get customer email template based on booking type
 * @param {string} bookingType - 'bireysel', 'grup', or 'paket'
 * @param {object} data - Booking data
 * @returns {object} Email subject and HTML body
 */
export function getCustomerEmailTemplate(bookingType, data) {
    const { customerName, serviceName, price, date, time, expertName } = data;

    const templates = {
        bireysel: {
            subject: "Sipariş Özeti - Bireysel",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Rezervasyonunuz Alındı</h1>
            </div>
            <div class="content">
              <p>Merhaba ${customerName},</p>
              <p>Bireysel danışmanlık rezervasyonunuz başarıyla oluşturuldu.</p>
              
              <div class="details">
                <p><span class="label">Hizmet:</span> ${serviceName}</p>
                <p><span class="label">Uzman:</span> ${expertName}</p>
                <p><span class="label">Tarih:</span> ${date || 'Uzman tarafından belirlenecek'}</p>
                <p><span class="label">Saat:</span> ${time || 'Uzman tarafından belirlenecek'}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Uzmanınız en kısa sürede sizinle iletişime geçecektir.</p>
              <p>Teşekkür ederiz!</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
        },

        grup: {
            subject: "Sipariş Özeti - Grup",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Grup Etkinliği Kaydınız Alındı</h1>
            </div>
            <div class="content">
              <p>Merhaba ${customerName},</p>
              <p>Grup etkinliği kaydınız başarıyla oluşturuldu.</p>
              
              <div class="details">
                <p><span class="label">Etkinlik:</span> ${serviceName}</p>
                <p><span class="label">Eğitmen:</span> ${expertName}</p>
                <p><span class="label">Tarih:</span> ${date || 'Yakında duyurulacak'}</p>
                <p><span class="label">Saat:</span> ${time || 'Yakında duyurulacak'}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Etkinlik detayları ve katılım bilgileri size e-posta ile gönderilecektir.</p>
              <p>Teşekkür ederiz!</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
        },

        paket: {
            subject: "Paket Satın Alındı",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 Paket Satın Alımınız Tamamlandı</h1>
            </div>
            <div class="content">
              <p>Merhaba ${customerName},</p>
              <p>Paket satın alımınız başarıyla gerçekleştirildi.</p>
              
              <div class="details">
                <p><span class="label">Paket:</span> ${serviceName}</p>
                <p><span class="label">Uzman:</span> ${expertName}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Paketinizi kullanmaya başlamak için uzmanınız sizinle iletişime geçecektir.</p>
              <p>Teşekkür ederiz!</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
        }
    };

    return templates[bookingType] || templates.bireysel;
}

/**
 * Get expert email template based on booking type
 * @param {string} bookingType - 'bireysel', 'grup', or 'paket'
 * @param {object} data - Booking data
 * @returns {object} Email subject and HTML body
 */
export function getExpertEmailTemplate(bookingType, data) {
    const { customerName, customerEmail, customerPhone, serviceName, price, date, time } = data;

    const templates = {
        bireysel: {
            subject: "Uzman Bildirimi - Bireysel",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Yeni Bireysel Rezervasyon</h1>
            </div>
            <div class="content">
              <p>Yeni bir bireysel danışmanlık rezervasyonu aldınız.</p>
              
              <div class="details">
                <h3>Müşteri Bilgileri</h3>
                <p><span class="label">Ad Soyad:</span> ${customerName}</p>
                <p><span class="label">E-posta:</span> ${customerEmail}</p>
                <p><span class="label">Telefon:</span> ${customerPhone}</p>
                
                <h3>Rezervasyon Detayları</h3>
                <p><span class="label">Hizmet:</span> ${serviceName}</p>
                <p><span class="label">Tarih:</span> ${date || 'Belirlenmedi'}</p>
                <p><span class="label">Saat:</span> ${time || 'Belirlenmedi'}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Lütfen müşterinizle en kısa sürede iletişime geçiniz.</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır.</p>
            </div>
          </div>
        </body>
        </html>
      `
        },

        grup: {
            subject: "Uzman Bildirimi - Grup",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👥 Yeni Grup Etkinliği Kaydı</h1>
            </div>
            <div class="content">
              <p>Grup etkinliğinize yeni bir katılımcı kaydoldu.</p>
              
              <div class="details">
                <h3>Katılımcı Bilgileri</h3>
                <p><span class="label">Ad Soyad:</span> ${customerName}</p>
                <p><span class="label">E-posta:</span> ${customerEmail}</p>
                <p><span class="label">Telefon:</span> ${customerPhone}</p>
                
                <h3>Etkinlik Detayları</h3>
                <p><span class="label">Etkinlik:</span> ${serviceName}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Katılımcı listesini kontrol panelinden görüntüleyebilirsiniz.</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır.</p>
            </div>
          </div>
        </body>
        </html>
      `
        },

        paket: {
            subject: "Uzman Bildirimi - Paket",
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Yeni Paket Satışı</h1>
            </div>
            <div class="content">
              <p>Yeni bir paket satışı gerçekleşti.</p>
              
              <div class="details">
                <h3>Müşteri Bilgileri</h3>
                <p><span class="label">Ad Soyad:</span> ${customerName}</p>
                <p><span class="label">E-posta:</span> ${customerEmail}</p>
                <p><span class="label">Telefon:</span> ${customerPhone}</p>
                
                <h3>Paket Detayları</h3>
                <p><span class="label">Paket:</span> ${serviceName}</p>
                <p><span class="label">Tutar:</span> ${price} TL</p>
              </div>
              
              <p>Lütfen müşterinizle iletişime geçerek paket kullanımını başlatınız.</p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir mesajdır.</p>
            </div>
          </div>
        </body>
        </html>
      `
        }
    };

    return templates[bookingType] || templates.bireysel;
}
