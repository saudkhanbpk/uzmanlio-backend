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
                    transition: transform 0.2s;
                }
                
                .video-link:hover {
                    transform: translateY(-1px);
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
                    
                    <p style="margin-top: 25px;">Uzmanınız en kısa sürede sizinle iletişime geçecektir.</p>
                    <p><strong>Teşekkür ederiz!</strong></p>
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

  return {
    subject: "Şifre Sıfırlama Kodu - Uzmanlio",
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .otp-box { background-color: white; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .otp-code { font-size: 36px; font-weight: bold; color: #dc3545; letter-spacing: 8px; margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #dc3545; }
            .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f0f0f0; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🔐 Şifre Sıfırlama</h1>
            </div>
            <div class="content">
              <div class="otp-box">
                <p style="font-size: 18px; margin-top: 0;"><strong>Merhaba ${name || 'Değerli Kullanıcı'},</strong></p>
                <p>Şifrenizi sıfırlamak için aşağıdaki doğrulama kodunu kullanın:</p>
                
                <div class="otp-code">
                  ${otp}
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Bu kod <strong>${expiryMinutes} dakika</strong> süreyle geçerlidir.
                </p>
              </div>

              <div class="warning-box">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Güvenlik Uyarısı:</strong> Bu kodu kimseyle paylaşmayın. Uzmanlio ekibi asla bu kodu sizden istemez.
                </p>
              </div>

              <p style="margin-top: 25px;">Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz. Hesabınız güvende.</p>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;"><strong>Uzmanlio</strong></p>
              <p style="margin: 15px 0 5px 0;">Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
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
 * @param {object} data - { inviterName, inviterEmail, teamName, invitationToken, acceptUrl, declineUrl }
 */
export function getSubUserInvitationTemplate(data) {
  return {
    subject: `${data.inviterName} sizi ${data.teamName} ekibine davet ediyor`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #009743 0%, #0e6836 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .invitation-box { background-color: white; padding: 25px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 12px 30px; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
            .button-accept { background-color: #009743; }
            .button-decline { background-color: #dc3545; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f0f0f0; border-radius: 0 0 10px 10px; }
            .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
            .info-row:last-child { border-bottom: none; }
            .icon { font-size: 20px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Ekip Daveti</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Uzmanlio Platformu</p>
            </div>
            <div class="content">
              <div class="invitation-box">
                <h2 style="color: #009743; margin-top: 0;">Merhaba!</h2>
                
                <p style="font-size: 16px; line-height: 1.8;">
                  <strong>${data.inviterName}</strong> (<a href="mailto:${data.inviterEmail}">${data.inviterEmail}</a>) 
                  sizi <strong>${data.teamName}</strong> ekibine alt kullanıcı olarak davet etti.
                </p>

                <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #009743; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #009743;">Alt Kullanıcı Olarak Neler Yapabilirsiniz?</h3>
                  
                  <div class="info-row">
                    <span class="icon">📅</span>
                    <strong>Randevu Yönetimi:</strong> Ekip randevularını görüntüleyin ve yönetin
                  </div>
                  
                  <div class="info-row">
                    <span class="icon">👥</span>
                    <strong>Müşteri Erişimi:</strong> Ekip müşterilerine erişim
                  </div>
                  
                  <div class="info-row">
                    <span class="icon">📊</span>
                    <strong>Raporlar:</strong> Ekip performans raporlarını görüntüleyin
                  </div>
                  
                  <div class="info-row">
                    <span class="icon">💼</span>
                    <strong>Hizmetler:</strong> Ekip hizmetlerini yönetin
                  </div>
                </div>

                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    <strong>⚠️ Önemli:</strong> Bu davet linki 7 gün boyunca geçerlidir. 
                    Daveti kabul etmek veya reddetmek için aşağıdaki butonları kullanın.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a style="text-decoration: none; color: #fff;" href="${data.acceptUrl}" class="button button-accept">
                    ✓ Daveti Kabul Et
                  </a>
                  <a style="text-decoration: none; color: #fff;" href="${data.declineUrl}" class="button button-decline">
                    ✗ Daveti Reddet
                  </a>
                </div>

                <div style="background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #004085;">
                    <strong>ℹ️ Bilgi:</strong> Daveti kabul ettikten sonra, 
                    <strong>${data.teamName}</strong> ekibinin bir parçası olacak ve ekip yöneticisinin 
                    belirlediği yetkilere sahip olacaksınız.
                  </p>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  Eğer bu daveti beklemiyorsanız, bu e-postayı görmezden gelebilirsiniz.
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
 * Email Verification Template
 * @param {object} data - { name, email, verificationUrl }
 */
export function getEmailVerificationTemplate(data) {
  const { name, email, verificationUrl } = data;

  return {
    subject: "E-posta Adresinizi Doğrulayın - Uzmanlio",
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #009743 0%, #0e6836 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px 20px; background-color: #f9f9f9; }
            .verification-box { background-color: white; padding: 30px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
            .button { display: inline-block; padding: 15px 40px; background-color: #009743; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
            .button:hover { background-color: #007a36; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f0f0f0; border-radius: 0 0 10px 10px; }
            .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">✉️ E-posta Doğrulama</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Uzmanlio Platformu</p>
            </div>
            <div class="content">
              <div class="verification-box">
                <div class="icon">🔐</div>
                <h2 style="color: #009743; margin-top: 0;">Hoş Geldiniz ${name}!</h2>
                
                <p style="font-size: 16px; line-height: 1.8; margin: 20px 0;">
                  Uzmanlio'ya kaydolduğunuz için teşekkür ederiz. Hesabınızı aktifleştirmek için 
                  e-posta adresinizi doğrulamanız gerekmektedir.
                </p>

                <p style="font-size: 14px; color: #666; margin: 15px 0;">
                  Doğrulama işlemi için aşağıdaki butona tıklayın:
                </p>

                <div style="margin: 30px 0;">
                  <a href="${verificationUrl}" class="button" style="color: white;">
                    E-postamı Doğrula
                  </a>
                </div>

                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 25px;">
                  <p style="margin: 0; font-size: 13px; color: #666;">
                    Buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayın:
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; word-break: break-all; color: #009743;">
                    ${verificationUrl}
                  </p>
                </div>
              </div>

              <div class="warning-box">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Önemli:</strong> Bu doğrulama linki 24 saat boyunca geçerlidir. 
                  Süre dolmadan önce e-postanızı doğrulamanız gerekmektedir.
                </p>
              </div>

              <div style="background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px; color: #004085;">
                  <strong>ℹ️ Bilgi:</strong> E-posta adresinizi doğruladıktan sonra, 
                  platformun tüm özelliklerini kullanabileceksiniz.
                </p>
              </div>

              <p style="margin-top: 25px; font-size: 14px; color: #666;">
                Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;"><strong>Uzmanlio</strong></p>
              <p style="margin: 5px 0;">Uzmanlık Alanınızda Profesyonel Hizmet Platformu</p>
              <p style="margin: 5px 0;">Destek: support@uzmanlio.com</p>
              <p style="margin: 15px 0 5px 0;">Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
            </div>
          </div>
        </body>
        </html>
      `
  };
}
