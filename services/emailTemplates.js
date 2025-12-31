// emailTemplates.js - Email templates for different booking types

/**
 * Get customer email template based on booking type
 * @param {string} bookingType - 'bireysel', 'grup', or 'paket'
 * @param {object} data - Booking data
 * @returns {object} Email subject and HTML body
 */
export function getCustomerEmailTemplate(bookingType, data) {
    const { customerName, serviceName, price, date, time, expertName, sessionsIncluded } = data;
    const purchaseDate = new Date().toLocaleDateString('tr-TR');

    const templates = {
        bireysel: {
            subject: "Randevunuz Oluşturuldu - Uzmanlio",
            html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevunuz Oluşturuldu</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .appointment-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 80px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .appointment-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Randevunuz Onaylandı!</h1>
            <p>Randevu detaylarınız aşağıda yer almaktadır</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${customerName}</strong>,
            </div>
            
            <p>Uzmanlio üzerinden oluşturduğunuz randevu başarıyla kaydedildi. Randevu detaylarınız aşağıdaki gibidir:</p>
            
            <div class="appointment-card">
                <div class="appointment-title">Randevu Detayları</div>
                <div class="appointment-details">
                    <div class="detail-item">
                        <div class="detail-label">Uzman:</div>
                        <div class="detail-value">${expertName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${date || 'Uzman tarafından belirlenecek'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${time || 'Uzman tarafından belirlenecek'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tutar:</div>
                        <div class="detail-value">${price} TL</div>
                    </div>
                </div>
            </div>
            
            <div class="important-note">
                <h4>⚠️ Önemli Hatırlatma</h4>
                <p>Randevu saatinden 15 dakika önce hazır olmanızı rica ederiz. Geç kalma durumunda lütfen uzmanınızla iletişime geçin.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio randevu sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
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
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sipariş Özeti</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .order-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .order-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .order-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 120px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .price-highlight {
            background: #009743;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
            text-align: center;
            width: 100%;
        }
        
        .status-card {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 10px;
        }
        
        .status-message {
            color: #1f2937;
            font-size: 15px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .order-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>🧾 Sipariş Özeti</h1>
            <p>Satın alma işleminiz başarıyla tamamlandı</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${customerName}</strong>,
            </div>
            
            <p>Uzmanlio üzerinden yapmış olduğunuz satın alma işlemi başarıyla tamamlanmıştır. Sipariş detaylarınız aşağıdaki gibidir:</p>
            
            <div class="order-card">
                <div class="order-title">📋 Sipariş Detayları</div>
                <div class="order-details">
                    <div class="detail-item">
                        <div class="detail-label">Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Uzman:</div>
                        <div class="detail-value">${expertName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${purchaseDate}</div>
                    </div>
                </div>
                
                <div class="price-highlight">💰 ${price} TL</div>
            </div>
            
            <div class="status-card">
                <div class="status-title">📅 Sonraki Adımlar</div>
                <div class="status-message">
                    Randevu talebiniz uzmana iletildi. Onaylandığında, katılım bilgileri tarafınıza iletilecek.
                </div>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio ödeme sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
        },

        paket: {
            subject: "Paket Satın Alındı - Uzmanlio",
            html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paket Satın Alma Onayı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .package-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .price-highlight {
            background: #009743;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
        }
        
        .session-counter {
            background: #e0f2fe;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>🎉 Paket Satın Alındı!</h1>
            <p>Ödemeniz başarıyla tamamlandı</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${customerName}</strong>,
            </div>
            
            <p><strong>${serviceName}</strong> paketini başarıyla satın aldınız! Ödemeniz onaylanmış ve paket hesabınıza tanımlanmıştır.</p>
            
            <div class="package-card">
                <h3>📦 Paket Detayları</h3>
                <div class="appointment-details">
                    <p><strong>📋 Paket:</strong> ${serviceName}</p>
                    <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                    <p><strong>📅 Satın Alma:</strong> ${purchaseDate}</p>
                </div>
                
                <div class="session-counter">
                    <h4>🎯 Seans Hakkı</h4>
                    <div style="font-size: 32px; font-weight: bold; color: #0d9488;">${sessionsIncluded || 'N/A'}</div>
                    <p>Seans hakkınız hesabınıza yüklendi</p>
                </div>
                
                <div style="text-align: center;">
                    <div class="price-highlight">💰 ${price} TL</div>
                </div>
            </div>
            
            <div class="important-note">
                <h4>📋 Paket Kullanım Bilgileri</h4>
                <ul style="text-align: left; margin-left: 20px;">
                    <li>Seans haklarınız otomatik olarak hesabınıza yüklenmiştir</li>
                    <li>Randevu oluştururken paket seanslarınız kullanılacaktır</li>
                    <li>Kalan seans haklarınızı panelinizden takip edebilirsiniz</li>
                </ul>
            </div>
            
            <div style="background: #F3F7F6; border: 2px solid #009743; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                <div style="font-size: 18px; font-weight: 600; color: #009743; margin-bottom: 10px;">📦 Paket Bilgisi</div>
                <div style="color: #1f2937; font-size: 15px;">
                    <strong>${serviceName}</strong> alımınız tamamlandı. Randevularınız <strong>${expertName}</strong> tarafından oluşturulacak ve otomatik olarak bilgilendirileceksiniz.
                </div>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>💡 İpucu:</strong> Paket seanslarınızı düzenli aralıklarla kullanarak maksimum fayda sağlayabilirsiniz.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio ödeme sistemi tarafından gönderilmiştir.</p>
            <p style="font-size: 12px; color: #9ca3af;">Fatura ve ödeme detayları için hesabınızı kontrol edebilirsiniz.</p>
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
    const {
        customerName,
        customerEmail,
        customerPhone,
        serviceName,
        price,
        date,
        time,
        expertName,
    } = data;
    const purchaseDate = new Date().toLocaleDateString('tr-TR');
    const panelUrl = process.env.BASE_URL || 'https://uzmanlio-v2-frontend.vercel.app';

    const templates = {
        bireysel: {
            subject: "Yeni Bireysel Randevu Talebi - Uzmanlio",
            html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yeni Bireysel Randevu Talebi</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .purchase-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .purchase-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .purchase-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 130px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .price-highlight {
            background: #009743;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
        }
        
        .action-card {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-title {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .action-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .panel-info {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .purchase-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>📅 Yeni Bireysel Randevu Talebi</h1>
            <p>Müşterinizden yeni randevu talebi geldi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${expertName || ''}</strong>,
            </div>
            
            <p><strong>${customerName}</strong> sizden bireysel randevu satın almıştır. Satın alma detayları aşağıdaki gibidir:</p>
            
            <div class="purchase-card">
                <div class="purchase-title">🛒 Satın Alma Detayları</div>
                <div class="purchase-details">
                    <div class="detail-item">
                        <div class="detail-label">Müşteri:</div>
                        <div class="detail-value">${customerName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">E-posta:</div>
                        <div class="detail-value">${customerEmail}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Telefon:</div>
                        <div class="detail-value">${customerPhone}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Satın Alma Tarihi:</div>
                        <div class="detail-value">${purchaseDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Etkinlik Tarihi:</div>
                        <div class="detail-value">${date || 'Belirtilmedi'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Etkinlik Saati:</div>
                        <div class="detail-value">${time || 'Belirtilmedi'}</div>
                    </div>
                </div>
                
                <div class="price-highlight">💰 ${price} TL</div>
            </div>
            
            <div class="action-card">
                <div class="action-title">✅ Randevu Onayı Gerekli</div>
                <p>Randevu talebini onaylamak ve detayları görüntülemek için panelinize göz atın.</p>
                
                <a href="${panelUrl}/dashboard" class="action-button" style="color: white;">Onay Vermek İçin Tıklayın</a>
                
                <div class="panel-info">
                    <p>Panelinizden randevu detaylarını görüntüleyebilir ve müşterinizle iletişime geçebilirsiniz.</p>
                </div>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio uzman bilgilendirme sistemi tarafından gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
        },

        grup: {
            subject: "Yeni Grup Seansı Satın Alımı - Uzmanlio",
            html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yeni Grup Seansı Satın Alımı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .purchase-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .purchase-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .purchase-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 130px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .price-highlight {
            background: #009743;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
        }
        
        .action-card {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-title {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .action-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .panel-info {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        
        .panel-info p {
            color: #1f2937;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .purchase-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>👥 Yeni Grup Seansı Satın Alımı</h1>
            <p>Grup seansınıza yeni katılımcı eklendi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${expertName || ''}</strong>,
            </div>
            
            <p><strong>${customerName}</strong> grup seansınızı satın almıştır. Satın alma detayları aşağıdaki gibidir:</p>
            
            <div class="purchase-card">
                <div class="purchase-title">🛒 Satın Alma Detayları</div>
                <div class="purchase-details">
                    <div class="detail-item">
                        <div class="detail-label">Müşteri:</div>
                        <div class="detail-value">${customerName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">E-posta:</div>
                        <div class="detail-value">${customerEmail}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Telefon:</div>
                        <div class="detail-value">${customerPhone}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Satın Alma Tarihi:</div>
                        <div class="detail-value">${purchaseDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Etkinlik Tarihi:</div>
                        <div class="detail-value">${date || 'Belirtilmedi'}</div>
                    </div>
                </div>
                
                <div class="price-highlight">💰 ${price} TL</div>
            </div>
            
            <div class="action-card">
                <div class="action-title">👥 Grup Seansı Yönetimi</div>
                <p>Grup seansı detaylarını görüntülemek ve yönetmek için panelinize göz atın.</p>
                
                <a href="${panelUrl}/dashboard" class="action-button" style="color: white;">Etkinliği Görüntüle</a>
                
                <div class="panel-info">
                    <p>Panelinizden grup seansı katılımcılarını görüntüleyebilir ve etkinlik detaylarını yönetebilirsiniz.</p>
                </div>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio uzman bilgilendirme sistemi tarafından gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
        },

        paket: {
            subject: "Yeni Paket Satışı - Uzmanlio",
            html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yeni Paket Satışı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .purchase-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .purchase-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .purchase-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 130px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .price-highlight {
            background: #009743;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
        }
        
        .action-card {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-title {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .action-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>📦 Yeni Paket Satışı</h1>
            <p>Yeni bir paket satışı gerçekleşti</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${expertName || ''}</strong>,
            </div>
            
            <p><strong>${customerName}</strong> paketinizi satın almıştır. Satış detayları aşağıdaki gibidir:</p>
            
            <div class="purchase-card">
                <div class="purchase-title">🛒 Satış Detayları</div>
                <div class="purchase-details">
                    <div class="detail-item">
                        <div class="detail-label">Müşteri:</div>
                        <div class="detail-value">${customerName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">E-posta:</div>
                        <div class="detail-value">${customerEmail}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Telefon:</div>
                        <div class="detail-value">${customerPhone}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Paket:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Satın Alma Tarihi:</div>
                        <div class="detail-value">${purchaseDate}</div>
                    </div>
                </div>
                
                <div class="price-highlight">💰 ${price} TL</div>
            </div>
            
            <div class="important-note">
                <h4>⚠️ Aksiyon Gerekli</h4>
                <p>Lütfen müşterinizle iletişime geçerek paket kullanımını başlatınız ve randevuları oluşturunuz.</p>
            </div>
            
            <div class="action-card">
                <div class="action-title">📋 Müşteri Yönetimi</div>
                <p>Müşteri detaylarını ve paket bilgilerini kontrol panelinden görüntüleyebilirsiniz.</p>
                
                <a href="${panelUrl}/dashboard" class="action-button" style="color: white;">Panele Git</a>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio uzman bilgilendirme sistemi tarafından gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
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
 * Get welcome email template for new user registration
 * @param {object} data - User data
 * @returns {object} Email subject and HTML body
 */
export function getWelcomeEmailTemplate(data) {
    const { name, email } = data;

    return {
        subject: "Uzmanlio'ya Hoş Geldiniz! 🎉",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #009743 0%, #0e6836 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .welcome-box { background-color: white; padding: 25px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 12px 30px; background-color: #009743; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f0f0f0; border-radius: 0 0 10px 10px; }
            .feature { padding: 15px 0; border-bottom: 1px solid #eee; }
            .feature:last-child { border-bottom: none; }
            .icon { font-size: 24px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Hoş Geldiniz!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Uzmanlio ailesine katıldığınız için teşekkür ederiz</p>
            </div>
            <div class="content">
              <div class="welcome-box">
                <p style="font-size: 18px; margin-top: 0;"><strong>Merhaba ${name},</strong></p>
                <p>Uzmanlio platformuna başarıyla kaydoldunuz! Artık uzmanlık alanınızda hizmet vermeye ve müşterilerinizle bağlantı kurmaya hazırsınız.</p>
                
                <div style="margin: 25px 0;">
                  <h3 style="color: #009743; margin-bottom: 15px;">Platformumuzda Neler Yapabilirsiniz?</h3>
                  
                  <div class="feature">
                    <span class="icon">📅</span>
                    <strong>Randevu Yönetimi:</strong> Müşterilerinizle kolayca randevu planlayın
                  </div>
                  
                  <div class="feature">
                    <span class="icon">💼</span>
                    <strong>Hizmet Paketleri:</strong> Özel hizmet paketleri oluşturun
                  </div>
                  
                  <div class="feature">
                    <span class="icon">👥</span>
                    <strong>Müşteri Takibi:</strong> Müşterilerinizi yönetin ve notlar ekleyin
                  </div>
                  
                  <div class="feature">
                    <span class="icon">📊</span>
                    <strong>Raporlama:</strong> Gelir ve performans raporlarınızı görüntüleyin
                  </div>
                  
                  <div class="feature">
                    <span class="icon">✉️</span>
                    <strong>E-posta Kampanyaları:</strong> Müşterilerinize toplu e-posta gönderin
                  </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a style="color: white;" href="${process.env.BASE_URL || 'https://uzmanlio-v2-frontend.vercel.app'}/login" class="button">
                    Hemen Başlayın
                  </a>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 25px;">
                  <strong>Hesap Bilgileriniz:</strong><br>
                  E-posta: ${email}<br>
                  Kayıt Tarihi: ${new Date().toLocaleDateString('tr-TR')}
                </p>
              </div>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #856404;">
                  <strong>💡 İpucu:</strong> Profilinizi tamamlayarak daha fazla müşteriye ulaşabilirsiniz!
                </p>
              </div>

              <p style="margin-top: 25px;">Herhangi bir sorunuz olursa, destek ekibimiz size yardımcı olmaktan mutluluk duyacaktır.</p>
              <p>İyi çalışmalar dileriz! 🚀</p>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;"><strong>Uzmanlio</strong></p>
              <p style="margin: 5px 0;">Uzmanlık Alanınızda Profesyonel Hizmet Platformu</p>
              <p style="margin: 15px 0 5px 0;">Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
}

/**
 * Get forgot password OTP email template
 * @param {object} data - OTP data
 * @returns {object} Email subject and HTML body
 */
export function getForgotPasswordOTPTemplate(data) {
    const { name, otp, expiryMinutes = 15 } = data;
    const requestTime = new Date().toLocaleString('tr-TR');

    return {
        subject: "🔒 Şifre Sıfırlama - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Şifre Sıfırlama</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .reset-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .reset-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #009743;
            letter-spacing: 8px;
            margin: 20px 0;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            border: 2px dashed #009743;
        }
        
        .security-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .security-info h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .security-info p {
            color: #1f2937;
            font-size: 14px;
        }
        
        .expiry-warning {
            background: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .expiry-warning h4 {
            color: #dc2626;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .reset-card {
                padding: 20px;
            }
            
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>🔒 Şifre Sıfırlama</h1>
            <p>Şifrenizi sıfırlama talebiniz alındı</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${name || 'Değerli Kullanıcı'}</strong>,
            </div>
            
            <p>Uzmanlio hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki kodu kullanarak şifrenizi sıfırlayabilirsiniz:</p>
            
            <div class="reset-card">
                <div class="reset-title">🔐 Doğrulama Kodunuz</div>
                <p>Yeni şifrenizi belirlemek için aşağıdaki kodu girin:</p>
                
                <div class="otp-code">${otp}</div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                    Talep Zamanı: ${requestTime}
                </p>
            </div>
            
            <div class="expiry-warning">
                <h4>⏰ Önemli Uyarı</h4>
                <p>Bu kod <strong>${expiryMinutes} dakika</strong> süre ile geçerlidir. Süre dolmadan şifrenizi sıfırlayın.</p>
            </div>
            
            <div class="security-info">
                <h4>🛡️ Güvenlik Bilgisi</h4>
                <p>Bu talebi siz yapmadıysanız, bu e-postayı dikkate almayın. Hesabınızın güvenliği için şifrenizi düzenli olarak değiştirmenizi öneririz. Bu kodu kimseyle paylaşmayın.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio güvenlik sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
    };
}

/**
 * Get password reset success email template
 * @param {object} data - User data
 * @returns {object} Email subject and HTML body
 */
export function getPasswordResetSuccessTemplate(data) {
    const { name, email, resetTime } = data;

    return {
        subject: "Şifreniz Başarıyla Değiştirildi - Uzmanlio",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .success-box { background-color: white; padding: 25px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .info-box { background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f0f0f0; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">✅ Şifre Değişikliği Başarılı</h1>
            </div>
            <div class="content">
              <div class="success-box">
                <p style="font-size: 18px; margin-top: 0;"><strong>Merhaba ${name || 'Değerli Kullanıcı'},</strong></p>
                <p>Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
                
                <div class="info-box">
                  <p style="margin: 0; color: #0c5460;">
                    <strong>📋 Değişiklik Detayları:</strong><br>
                    Hesap: ${email}<br>
                    Değişiklik Zamanı: ${resetTime || new Date().toLocaleString('tr-TR')}<br>
                    IP Adresi: Güvenlik nedeniyle kaydedildi
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a style="text-decoration: none; color: white;" href="${process.env.BASE_URL || 'https://uzmanlio-v2-frontend.vercel.app'}/login" class="button">
                    Giriş Yap
                  </a>
                </div>

                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0; color: #856404;">
                    <strong>⚠️ Önemli:</strong> Bu değişikliği siz yapmadıysanız, lütfen derhal bizimle iletişime geçin. Hesabınız risk altında olabilir.
                  </p>
                </div>

                <p style="margin-top: 25px; font-size: 14px; color: #666;">
                  <strong>Güvenlik İpuçları:</strong><br>
                  • Şifrenizi düzenli olarak değiştirin<br>
                  • Güçlü ve benzersiz şifreler kullanın<br>
                  • Şifrenizi kimseyle paylaşmayın<br>
                  • İki faktörlü kimlik doğrulamayı etkinleştirin
                </p>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;"><strong>Uzmanlio</strong></p>
              <p style="margin: 5px 0;">Destek: support@uzmanlio.com</p>
              <p style="margin: 15px 0 5px 0;">Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
}

/**
 * Sub-User Invitation Email Template
 * @param {object} data - { inviterName, inviterEmail, teamName, invitationToken, acceptUrl, declineUrl, expiryDate }
 */
export function getSubUserInvitationTemplate(data) {
    const expiryDate = data.expiryDate || '7 gün';

    return {
        subject: `👥 ${data.inviterName} sizi Uzmanlio'ya davet ediyor`,
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alt Kullanıcı Daveti</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .invitation-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .invitation-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .invitation-details {
            margin: 15px 0;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
            margin: 12px 0;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 120px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .accept-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin: 20px 0;
            transition: background-color 0.2s;
        }
        
        .accept-button:hover {
            background: #007a35;
        }
        
        .expiry-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .expiry-info h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .invitation-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>👥 Alt Kullanıcı Daveti</h1>
            <p>Uzmanlio platformuna davet edildiniz</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba,
            </div>
            
            <p><strong>${data.inviterName}</strong> tarafından Uzmanlio platformunda alt kullanıcı olarak davet edildiniz. Bu davet ile hesap oluşturarak platformumuza katılabilirsiniz.</p>
            
            <div class="invitation-card">
                <div class="invitation-title">📋 Davet Detayları</div>
                <div class="invitation-details">
                    <div class="detail-item">
                        <div class="detail-label">Davet Eden:</div>
                        <div class="detail-value">${data.inviterName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">E-posta:</div>
                        <div class="detail-value">${data.inviterEmail}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Organizasyon:</div>
                        <div class="detail-value">${data.teamName}</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${data.acceptUrl}" class="accept-button" style="color: white;">Daveti Kabul Et</a>
                </div>
            </div>
            
            <div class="expiry-info">
                <h4>⏰ Davet Geçerliliği</h4>
                <p>Bu davet <strong>${expiryDate}</strong> süre ile geçerlidir. Bu süreden sonra davet geçersiz hale gelecektir.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio davet sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
    };
}

/**
 * Email Verification Template
 * @param {object} data - { name, email, verificationUrl }
 */
export function getEmailVerificationTemplate(data) {
    const { name, email, verificationUrl } = data;
    const expiryTime = '24 saat';

    return {
        subject: "✉️ E-posta Doğrulama - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-posta Doğrulama</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .verification-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .verification-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .verification-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin: 15px 0;
            transition: background-color 0.2s;
        }
        
        .verification-button:hover {
            background: #007a35;
        }
        
        .alternative-method {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .alternative-method h4 {
            color: #0369a1;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .alternative-method p {
            color: #1f2937;
            font-size: 14px;
            word-break: break-all;
        }
        
        .expiry-warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .expiry-warning h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .verification-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>✉️ E-posta Doğrulama</h1>
            <p>Hesabınızı aktifleştirmek için e-postanızı doğrulayın</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${name || 'Değerli Kullanıcı'}</strong>,
            </div>
            
            <p>Uzmanlio'ya hoş geldiniz! Hesabınızı aktifleştirmek için e-posta adresinizi (<strong>${email}</strong>) doğrulamanız gerekmektedir.</p>
            
            <div class="verification-card">
                <div class="verification-title">🔐 E-posta Doğrulama</div>
                <p>Aşağıdaki butona tıklayarak e-postanızı doğrulayabilirsiniz:</p>
                
                <a href="${verificationUrl}" class="verification-button" style="color: white;">Tek Tık ile Doğrula</a>
            </div>
            
            <div class="alternative-method">
                <h4>🔗 Alternatif Doğrulama</h4>
                <p>Buton çalışmıyorsa, aşağıdaki bağlantıyı tarayıcınıza kopyalayın:</p>
                <p style="margin-top: 10px; color: #009743; font-size: 12px;">${verificationUrl}</p>
            </div>
            
            <div class="expiry-warning">
                <h4>⏰ Önemli Bilgi</h4>
                <p>Doğrulama bağlantısı <strong>${expiryTime}</strong> süre ile geçerlidir. Bu süreden sonra yeni bir doğrulama talebi yapmanız gerekecektir.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio hesap doğrulama sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
      `
    };
}

/**
 * Get cancellation email template for customer when expert cancels appointment
 * @param {object} data - Cancellation data
 * @returns {object} Email subject and HTML body
 */
export function getCancellationEmailTemplate(data) {
    const {
        customerName,
        expertName,
        serviceName,
        originalDate,
        serviceType = 'Bireysel',
        refundAmount = '0 TL',
        refundProcessDays = '3-5'
    } = data;
    const cancellationDate = new Date().toLocaleDateString('tr-TR');

    return {
        subject: "İptal ve İade Bildirimi - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>İptal ve İade Bildirimi</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .cancellation-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .cancellation-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .cancellation-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 140px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .refund-highlight {
            background: #009743;
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .refund-process-card {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .process-title {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .process-steps {
            text-align: left;
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .process-steps li {
            margin: 8px 0;
            color: #1f2937;
            font-size: 14px;
        }
        
        .timeline-info {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        
        .timeline-info h4 {
            color: #0369a1;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .timeline-info p {
            color: #1f2937;
            font-size: 14px;
        }
        
        .contact-card {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .contact-card h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .contact-card p {
            color: #1f2937;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .cancellation-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>❌ İptal ve İade Bildirimi</h1>
            <p>Hizmet iptal işlemi gerçekleştirilmiştir</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${customerName}</strong>,
            </div>
            
            <p><strong>${expertName}</strong> tarafından <strong>${serviceName}</strong> hizmetiniz iptal edilmiştir. İptal ve iade detayları aşağıdaki gibidir:</p>
            
            <div class="cancellation-card">
                <div class="cancellation-title">📋 İptal Detayları</div>
                <div class="cancellation-details">
                    <div class="detail-item">
                        <div class="detail-label">İptal Edilen Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Uzman:</div>
                        <div class="detail-value">${expertName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">İptal Tarihi:</div>
                        <div class="detail-value">${cancellationDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Orijinal Tarih:</div>
                        <div class="detail-value">${originalDate || 'Belirtilmedi'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hizmet Türü:</div>
                        <div class="detail-value">${serviceType}</div>
                    </div>
                </div>
            </div>
            
            <div class="refund-highlight">
                💰 İade Miktarı: ${refundAmount}
            </div>
            
            <div class="refund-process-card">
                <div class="process-title">🔄 İade Süreci</div>
                <p>İade işleminiz otomatik olarak başlatılmıştır. Aşağıdaki adımlar takip edilecektir:</p>
                
                <ul class="process-steps">
                    <li>✅ İptal işlemi tamamlandı</li>
                    <li>🔄 İade talebi oluşturuldu</li>
                    <li>⏳ Ödeme sağlayıcısına iletildi</li>
                    <li>💳 Hesabınıza iade edilecek</li>
                </ul>
                
                <div class="timeline-info">
                    <h4>⏰ İade Süresi</h4>
                    <p>İade tutarı <strong>${refundProcessDays} iş günü</strong> içerisinde ödeme yaptığınız kartınıza iade edilecektir.</p>
                </div>
            </div>
            
            <div class="contact-card">
                <h4>📞 Destek İhtiyacı</h4>
                <p>İptal nedeni veya iade süreci hakkında sorularınız varsa, müşteri destek ekibimizle iletişime geçebilirsiniz.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio iptal ve iade sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Get appointment approved email template for 1-1 (bireysel) appointments
 * @param {object} data - Appointment data
 * @returns {object} Email subject and HTML body
 */
export function getAppointmentApprovedBireyselTemplate(data) {
    const {
        customerName,
        expertName,
        appointmentDate,
        appointmentTime,
        appointmentLocation = 'Online',
        videoLink = ''
    } = data;

    return {
        subject: "Randevunuz Onaylandı - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevunuz Onaylandı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .appointment-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 80px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .video-link {
            background: #009743;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            margin: 20px 0;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .appointment-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Randevunuz Onaylandı!</h1>
            <p>Randevu detaylarınız aşağıda yer almaktadır</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${customerName}</strong>,
            </div>
            
            <p>Uzmanlio üzerinden oluşturduğunuz randevu başarıyla kaydedildi. Randevu detaylarınız aşağıdaki gibidir:</p>
            
            <div class="appointment-card">
                <div class="appointment-title">Randevu Detayları</div>
                <div class="appointment-details">
                    <div class="detail-item">
                        <div class="detail-label">Uzman:</div>
                        <div class="detail-value">${expertName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${appointmentDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${appointmentTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Yer:</div>
                        <div class="detail-value">${appointmentLocation}</div>
                    </div>
                </div>
                
                ${videoLink ? `<a href="${videoLink}" class="video-link" style="color: white;">🎥 Video Konferansa Katıl</a>` : ''}
            </div>
            
            <div class="important-note">
                <h4>⚠️ Önemli Hatırlatma</h4>
                <p>Randevu saatinden 15 dakika önce hazır olmanızı rica ederiz. Geç kalma durumunda lütfen uzmanınızla iletişime geçin.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio randevu sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Get group session participation approved email template
 * @param {object} data - Session data
 * @returns {object} Email subject and HTML body
 */
export function getGroupSessionApprovedTemplate(data) {
    const {
        participantName,
        sessionName,
        sessionDate,
        sessionTime,
        videoLink = ''
    } = data;
    const joinDate = new Date().toLocaleDateString('tr-TR');

    return {
        subject: "Grup Seansına Katılım Onaylandı - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grup Seansı Katılım Onayı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .success-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .checkmark {
            font-size: 48px;
            color: #059669;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .join-group {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .join-group h3 {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .group-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .important-note ul {
            text-align: left;
            margin-left: 20px;
        }
        
        .important-note li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>✅ Katılım Onaylandı!</h1>
            <p>Grup seansına başarıyla katıldınız</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${participantName}</strong>,
            </div>
            
            <div class="success-card">
                <div class="checkmark">✅</div>
                <h3>Grup Seansına Katılım Onaylandı!</h3>
                <p><strong>${sessionName}</strong> grup seansına başarıyla katıldınız.</p>
            </div>
            
            <p>${joinDate} tarihinde grup seansına katılım talebiniz onaylanmıştır. Seans detayları aşağıdaki gibidir:</p>
            
            <div class="appointment-details">
                <p><strong>📋 Seans:</strong> ${sessionName}</p>
                <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
            </div>
            
            ${videoLink ? `
            <div class="join-group">
                <h3>🎥 Seans Bağlantısı</h3>
                <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                <a href="${videoLink}" class="group-button" style="color: white;">Grup Seansına Katıl</a>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>💡 Hazırlık Önerileri</h4>
                <ul>
                    <li>Seans öncesi rahat bir ortam hazırlayın</li>
                    <li>Not tutmak için kalem ve kağıt bulundurun</li>
                    <li>Açık fikirli ve katılımcı olmaya hazır olun</li>
                    <li>Sorularınızı önceden düşünün</li>
                </ul>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio grup seansı sistemi tarafından gönderilmiştir.</p>
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .success-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .checkmark {
            font-size: 48px;
            color: #059669;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .join-group {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .join-group h3 {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .group-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .important-note ul {
            text-align: left;
            margin-left: 20px;
        }
        
        .important-note li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>✅ Katılım Onaylandı!</h1>
            <p>Grup seansına başarıyla katıldınız</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${participantName}</strong>,
            </div>
            
            <div class="success-card">
                <div class="checkmark">✅</div>
                <h3>Grup Seansına Katılım Onaylandı!</h3>
                <p><strong>${sessionName}</strong> grup seansına başarıyla katıldınız.</p>
            </div>
            
            <p>${joinDate} tarihinde grup seansına katılım talebiniz onaylanmıştır. Seans detayları aşağıdaki gibidir:</p>
            
            <div class="appointment-details">
                <p><strong>📋 Seans:</strong> ${sessionName}</p>
                <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
            </div>
            
            ${videoLink ? `
            <div class="join-group">
                <h3>🎥 Seans Bağlantısı</h3>
                <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                <a href="${videoLink}" class="group-button" style="color: white;">Grup Seansına Katıl</a>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>💡 Hazırlık Önerileri</h4>
                <ul>
                    <li>Seans öncesi rahat bir ortam hazırlayın</li>
                    <li>Not tutmak için kalem ve kağıt bulundurun</li>
                    <li>Açık fikirli ve katılımcı olmaya hazır olun</li>
                    <li>Sorularınızı önceden düşünün</li>
                </ul>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio grup seansı sistemi tarafından gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Expert notification when they create a bireysel (1-1) appointment via panel
 */
export function getExpertCreatedBireyselTemplate(data) {
    const {
        expertName,
        clientName,
        appointmentDate,
        appointmentTime,
        appointmentLocation = 'Online',
        videoLink = ''
    } = data;

    return {
        subject: "Yeni Randevu Oluşturuldu - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yeni Randevu Bilgisi</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .client-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 100px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .video-link {
            background: #009743;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            margin: 20px 0;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Yeni Randevu Bilgisi</h1>
            <p>Panelden oluşturduğunuz randevu kaydedildi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${expertName}</strong>,
            </div>
            
            <p>Panelinizden <strong>${clientName}</strong> için yeni bir randevu oluşturdunuz. Detaylar aşağıdaki gibidir:</p>
            
            <div class="client-card">
                <div class="appointment-title">Randevu Detayları</div>
                <div class="appointment-details">
                    <div class="detail-item">
                        <div class="detail-label">Danışan:</div>
                        <div class="detail-value">${clientName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${appointmentDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${appointmentTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Yer:</div>
                        <div class="detail-value">${appointmentLocation}</div>
                    </div>
                </div>
                
                ${videoLink ? `<a href="${videoLink}" class="video-link" style="color: white;">🎥 Video Konferansa Katıl</a>` : ''}
            </div>
            
            <p>Danışanınıza da randevu onayı e-postası gönderilmiştir.</p>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio sistemi tarafından otomatik gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Client notification when expert creates a bireysel (1-1) appointment for them
 */
export function getClientCreatedBireyselTemplate(data) {
    const {
        clientName,
        expertName,
        appointmentDate,
        appointmentTime,
        appointmentLocation = 'Online',
        videoLink = ''
    } = data;

    return {
        subject: "Randevunuz Oluşturuldu - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevunuz Oluşturuldu</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .appointment-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #374151;
            min-width: 80px;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 400;
        }
        
        .video-link {
            background: #009743;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            margin: 20px 0;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Randevunuz Onaylandı!</h1>
            <p>Randevu detaylarınız aşağıda yer almaktadır</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${clientName}</strong>,
            </div>
            
            <p>Uzmanlio üzerinden oluşturduğunuz randevu başarıyla kaydedildi. Randevu detaylarınız aşağıdaki gibidir:</p>
            
            <div class="appointment-card">
                <div class="appointment-title">Randevu Detayları</div>
                <div class="appointment-details">
                    <div class="detail-item">
                        <div class="detail-label">Uzman:</div>
                        <div class="detail-value">${expertName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${appointmentDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${appointmentTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Yer:</div>
                        <div class="detail-value">${appointmentLocation}</div>
                    </div>
                </div>
                
                ${videoLink ? `<a href="${videoLink}" class="video-link" style="color: white;">🎥 Video Konferansa Katıl</a>` : ''}
            </div>
            
            <div class="important-note">
                <h4>⚠️ Önemli Hatırlatma</h4>
                <p>Randevu saatinden 15 dakika önce hazır olmanızı rica ederiz. Geç kalma durumunda lütfen uzmanınızla iletişime geçin.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta, Uzmanlio randevu sistemi tarafından otomatik olarak gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Group session invite email when expert creates a group event
 */
export function getGroupSessionInviteTemplate(data) {
    const {
        participantName,
        expertName,
        sessionName,
        sessionDate,
        sessionTime,
        sessionDuration = '60 dakika',
        videoLink = ''
    } = data;

    return {
        subject: "Grup Seansı Daveti - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grup Seansı Daveti</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .group-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .join-group {
            background: #F3F7F6;
            color: #1f2937;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            border: 2px solid #009743;
        }
        
        .group-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .important-note ul {
            text-align: left;
            margin-left: 20px;
        }
        
        .important-note li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>👥 Grup Seansı Daveti</h1>
            <p>Yeni bir grup seansına davet edildiniz!</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${participantName}</strong>,
            </div>
            
            <p><strong>${expertName}</strong> tarafından bir grup seansına davet edildiniz. Bu özel grup seansında diğer katılımcılarla birlikte değerli deneyimler yaşayacaksınız.</p>
            
            <div class="group-card">
                <h3>👥 Grup Seansı Detayları</h3>
                <div class="appointment-details">
                    <p><strong>📋 Seans Adı:</strong> ${sessionName}</p>
                    <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                    <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                    <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
                    <p><strong>⏱️ Süre:</strong> ${sessionDuration}</p>
                </div>
            </div>
            
            ${videoLink ? `
            <div class="join-group">
                <h3>🎥 Grup Seansına Katıl</h3>
                <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                <a href="${videoLink}" class="group-button" style="color: white;">Grup Seansına Katıl</a>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>📋 Grup Seansı Kuralları</h4>
                <ul>
                    <li>Seans başlamadan 10 dakika önce bağlantıya tıklayın</li>
                    <li>Sessiz bir ortam tercih edin</li>
                    <li>Diğer katılımcılara saygılı olun</li>
                    <li>Konuşma sırası geldiğinde mikrofonunuzu açın</li>
                </ul>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio grup seansı sistemi tarafından gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Group session confirmation email after expert creates group event
 */
export function getGroupSessionConfirmationTemplate(data) {
    const {
        participantName,
        sessionName,
        sessionDate,
        sessionTime,
        videoLink = ''
    } = data;
    const joinDate = new Date().toLocaleDateString('tr-TR');

    return {
        subject: "Grup Seansına Katılım Onaylandı - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grup Seansı Katılım Onayı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .success-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .checkmark {
            font-size: 48px;
            color: #059669;
            margin-bottom: 15px;
        }
        
        .appointment-details {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .join-group {
            background: #F3F7F6;
            border: 2px solid #009743;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .join-group h3 {
            font-size: 18px;
            font-weight: 600;
            color: #009743;
            margin-bottom: 15px;
        }
        
        .group-button {
            background: #009743;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .important-note ul {
            text-align: left;
            margin-left: 20px;
        }
        
        .important-note li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>✅ Katılım Onaylandı!</h1>
            <p>Grup seansına başarıyla katıldınız</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${participantName}</strong>,
            </div>
            
            <div class="success-card">
                <div class="checkmark">✅</div>
                <h3>Grup Seansına Katılım Onaylandı!</h3>
                <p><strong>${sessionName}</strong> grup seansına başarıyla katıldınız.</p>
            </div>
            
            <p>${joinDate} tarihinde grup seansına katılım talebiniz onaylanmıştır. Seans detayları aşağıdaki gibidir:</p>
            
            <div class="appointment-details">
                <p><strong>📋 Seans:</strong> ${sessionName}</p>
                <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
            </div>
            
            ${videoLink ? `
            <div class="join-group">
                <h3>🎥 Seans Bağlantısı</h3>
                <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                <a href="${videoLink}" class="group-button" style="color: white;">Grup Seansına Katıl</a>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>💡 Hazırlık Önerileri</h4>
                <ul>
                    <li>Seans öncesi rahat bir ortam hazırlayın</li>
                    <li>Not tutmak için kalem ve kağıt bulundurun</li>
                    <li>Açık fikirli ve katılımcı olmaya hazır olun</li>
                    <li>Sorularınızı önceden düşünün</li>
                </ul>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio grup seansı sistemi tarafından gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Package session usage notification email
 */
export function getPackageSessionUsageTemplate(data) {
    const {
        clientName,
        packageName,
        expertName,
        appointmentDate,
        usedSessions,
        remainingSessions
    } = data;
    const usageDate = new Date().toLocaleDateString('tr-TR');
    const progressPercent = usedSessions && remainingSessions ?
        Math.round((usedSessions / (usedSessions + remainingSessions)) * 100) : 50;

    return {
        subject: "Paket Seans Kullanım Bildirimi - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paket Seans Kullanımı</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #1f2937;
        }
        
        .usage-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .session-progress {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .progress-bar {
            background: #e5e7eb;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin: 15px 0;
        }
        
        .progress-fill {
            background: #009743;
            height: 100%;
            border-radius: 10px;
        }
        
        .remaining-highlight {
            font-size: 24px;
            font-weight: bold;
            color: #0369a1;
            margin: 10px 0;
        }
        
        .important-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .important-note h4 {
            color: #d97706;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .important-note ul {
            text-align: left;
            margin-left: 20px;
        }
        
        .important-note li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .tip-box {
            background: #dcfce7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>📊 Seans Kullanım Bildirimi</h1>
            <p>Paket seansınız kullanıldı</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${clientName}</strong>,
            </div>
            
            <p><strong>${packageName}</strong> paketinizden seans hakkı kullanıldı. Kullanım detayları aşağıdaki gibidir:</p>
            
            <div class="usage-card">
                <h3>📋 Kullanım Detayları</h3>
                <div class="appointment-details">
                    <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                    <p><strong>📅 Randevu Tarihi:</strong> ${appointmentDate}</p>
                    <p><strong>📊 Kullanım Tarihi:</strong> ${usageDate}</p>
                    <p><strong>🎯 Kullanılan Seans:</strong> ${usedSessions || 1}</p>
                </div>
            </div>
            
            <div class="session-progress">
                <h4>📈 Paket Durumu</h4>
                <div class="remaining-highlight">${remainingSessions || 0}</div>
                <p>Kalan Seans Hakkı</p>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">Paket: ${packageName}</p>
            </div>
            
            <div class="important-note">
                <h4>📋 Seans Hakkı Bilgileri</h4>
                <ul>
                    <li>Toplam kullanılan seans: ${usedSessions || 1}</li>
                    <li>Kalan seans hakkı: ${remainingSessions || 0}</li>
                    <li>Paket durumunu panelinizden takip edebilirsiniz</li>
                    <li>Yeni randevu oluştururken kalan haklarınız otomatik kullanılacaktır</li>
                </ul>
            </div>
            
            <div class="tip-box">
                <p><strong>💡 Kalan Seanslarınız İçin:</strong><br>
                Randevu oluşturmaya devam edebilir, uzmanınızla düzenli seanslar planlayabilirsiniz.</p>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio paket yönetim sistemi tarafından gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Marketing Email Template - Expert custom email with Uzmanlio branding
 * @param {object} data - { subject, body, expertName, companyName }
 * @returns {object} Email subject and HTML body
 */
export function getMarketingEmailTemplate(data) {
    const { subject, body, expertName, companyName } = data;

    return {
        subject: subject,
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
            background: #CDFA89;
            padding: 40px 30px;
            text-align: center;
            color: #1f2937;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .email-body {
            font-size: 16px;
            line-height: 1.8;
            color: #1f2937;
            white-space: pre-line;
        }
        
        .signature {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .signature p {
            font-size: 15px;
            color: #374151;
            margin: 5px 0;
        }
        
        .signature .name {
            font-weight: 600;
            font-size: 16px;
            color: #1f2937;
        }
        
        .signature .company {
            color: #009743;
            font-weight: 500;
        }
        
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>${subject}</h1>
        </div>
        
        <div class="content">
            <div class="email-body">
                ${body}
            </div>
            
            <div class="signature">
                ${expertName ? `<p class="name">${expertName}</p>` : ''}
                ${companyName ? `<p class="company">${companyName}</p>` : ''}
                <p style="margin-top: 10px;"><strong>Uzmanlio</strong></p>
            </div>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio pazarlama sistemi tarafından gönderilmiştir.</p>
            <div class="contact-info">
                <p>Uzmanlio</p>
                <p>www.uzmanlio.com | destek@uzmanlio.com</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
    };
}

/**
 * Subscription Invoice Email Template
 * @param {object} data - { userName, email, planType, duration, price, seats, invoiceNumber, invoiceUrl, subscriptionStartDate, subscriptionEndDate }
 * @returns {object} Email subject and HTML body
 */
export function getSubscriptionInvoiceEmailTemplate(data) {
    const { userName, email, planType, duration, price, seats, invoiceNumber, invoiceUrl, subscriptionStartDate, subscriptionEndDate } = data;

    return {
        subject: `Fatura Oluşturuldu - ${invoiceNumber} | Uzmanlio`,
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura Bilgilendirmesi</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                🧾 Faturanız Hazır!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                Abonelik faturanız başarıyla oluşturuldu
            </p>
        </div>

        <!-- Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            
            <p style="color: #374151; font-size: 16px; margin: 0 0 25px;">
                Merhaba <strong>${userName}</strong>,
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                Uzmanlio aboneliğiniz için faturanız başarıyla oluşturulmuştur.
            </p>

            <!-- Invoice Details Box -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; margin: 0 0 15px; font-size: 18px;">📋 Fatura Bilgileri</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Fatura Numarası:</td>
                        <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Tutar:</td>
                        <td style="color: #22c55e; padding: 8px 0; font-size: 16px; text-align: right; font-weight: 700;">₺${price?.toLocaleString('tr-TR') || price}</td>
                    </tr>
                </table>
            </div>

            <!-- Subscription Details Box -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
                <h3 style="color: #1e293b; margin: 0 0 15px; font-size: 18px;">📦 Abonelik Detayları</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Plan:</td>
                        <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${planType}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Süre:</td>
                        <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${duration}</td>
                    </tr>
                    ${seats > 0 ? `<tr><td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Koltuk:</td><td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${seats}</td></tr>` : ''}
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Başlangıç:</td>
                        <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${subscriptionStartDate}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Bitiş:</td>
                        <td style="color: #111827; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${subscriptionEndDate}</td>
                    </tr>
                </table>
            </div>

            ${invoiceUrl ? `<div style="text-align: center; margin: 30px 0;"><a href="${invoiceUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Faturayı Görüntüle</a></div>` : ''}

            <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 25px 0 0;">
                Bizi tercih ettiğiniz için teşekkür ederiz!<br><strong>Uzmanlio Ekibi</strong>
            </p>
        </div>

        <div style="text-align: center; padding: 25px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Uzmanlio. Tüm hakları saklıdır.</p>
        </div>
    </div>
</body>
</html>
        `
    };
}

/**
 * Get email template for Event Update (Date/Time change)
 */
export function getEventUpdatedTemplate(data) {
    const { clientName, expertName, newDate, newTime, appointmentLocation, videoLink } = data;
    return {
        subject: "Randevu Bilgileri Güncellendi - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Güncelleme</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: #e0f2fe; padding: 40px 30px; text-align: center; color: #075985; }
        .content { padding: 40px 30px; }
        .appointment-card { background: #f0f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #0ea5e9; }
        .detail-item { margin: 10px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Randevu Güncellendi</h1>
            <p>Randevu bilgilerinizde değişiklik yapıldı.</p>
        </div>
        <div class="content">
            <p>Merhaba <strong>${clientName}</strong>,</p>
            <p><strong>${expertName}</strong> ile olan randevunuzun bilgileri güncellenmiştir.</p>
            
            <div class="appointment-card">
                <h3>📅 Yeni Detaylar</h3>
                <div class="detail-item"><strong>Tarih:</strong> ${newDate}</div>
                <div class="detail-item"><strong>Saat:</strong> ${newTime}</div>
                <div class="detail-item"><strong>Konum:</strong> ${appointmentLocation}</div>
                ${videoLink ? `<div style="margin-top: 15px;"><a href="${videoLink}" style="background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Görüşmeye Katıl</a></div>` : ''}
            </div>
        </div>
        <div class="footer">
            <p>Uzmanlio Ekibi</p>
        </div>
    </div>
</body>
</html>
        `
    };
}
