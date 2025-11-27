// Event Email Templates for Expert and Clients

/**
 * Get expert notification email when they create a new event
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getExpertEventCreatedTemplate(data) {
    const { expertName, clientName, eventDate, eventTime, eventLocation, videoLink, serviceName } = data;

    return {
        subject: "Yeni Randevu Bilgisi - Uzmanlio",
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
              
              .content {
                  padding: 40px 30px;
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
              
              .detail-item {
                  margin: 10px 0;
              }
              
              .detail-label {
                  font-weight: 500;
                  color: #374151;
              }
              
              .detail-value {
                  color: #1f2937;
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
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
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
                          ${serviceName ? `<div class="detail-item">
                              <span class="detail-label">Hizmet:</span>
                              <span class="detail-value">${serviceName}</span>
                          </div>` : ''}
                          <div class="detail-item">
                              <span class="detail-label">Danışan:</span>
                              <span class="detail-value">${clientName}</span>
                          </div>
                          <div class="detail-item">
                              <span class="detail-label">Tarih:</span>
                              <span class="detail-value">${eventDate || 'Belirtilmedi'}</span>
                          </div>
                          <div class="detail-item">
                              <span class="detail-label">Saat:</span>
                              <span class="detail-value">${eventTime || 'Belirtilmedi'}</span>
                          </div>
                          <div class="detail-item">
                              <span class="detail-label">Yer:</span>
                              <span class="detail-value">${eventLocation || 'Online'}</span>
                          </div>
                      </div>
                      
                      ${videoLink ? `<a href="${videoLink}" class="video-link">🎥 Video Konferansa Katıl</a>` : ''}
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
 * Get client notification email for 1-1 session
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClient11SessionTemplate(data) {
    const { participantName, expertName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink } = data;

    return {
        subject: "Yeni Randevu Daveti - Uzmanlio",
        html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Randevu Daveti</title>
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
              
              .content {
                  padding: 40px 30px;
              }
              
              .session-card {
                  background: #F3F7F6;
                  border-radius: 12px;
                  padding: 25px;
                  margin: 25px 0;
                  border-left: 4px solid #009743;
              }
              
              .join-session {
                  background: #F3F7F6;
                  color: #1f2937;
                  padding: 20px;
                  border-radius: 12px;
                  text-align: center;
                  margin: 25px 0;
                  border: 2px solid #009743;
              }
              
              .session-button {
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
              
              .footer {
                  background-color: #f9fafb;
                  padding: 30px;
                  text-align: center;
                  border-top: 1px solid #e5e7eb;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📅 Randevu Daveti</h1>
                  <p>Yeni bir randevuya davet edildiniz!</p>
              </div>
              
              <div class="content">
                  <div class="greeting">
                      Merhaba <strong>${participantName}</strong>,
                  </div>
                  
                  <p><strong>${expertName}</strong> tarafından bir randevuya davet edildiniz.</p>
                  
                  <div class="session-card">
                      <h3>📅 Randevu Detayları</h3>
                      <div class="appointment-details">
                          <p><strong>📋 Seans Adı:</strong> ${sessionName}</p>
                          <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                          <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                          <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
                          ${sessionDuration ? `<p><strong>⏱️ Süre:</strong> ${sessionDuration}</p>` : ''}
                      </div>
                  </div>
                  
                  ${videoLink ? `
                  <div class="join-session">
                      <h3>🎥 Randevuya Katıl</h3>
                      <p>Randevu saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                      <a href="${videoLink}" class="session-button">Randevuya Katıl</a>
                  </div>
                  ` : ''}
                  
                  <div class="important-note">
                      <h4>⚠️ Önemli Hatırlatma</h4>
                      <p>Randevu başlamadan 10 dakika önce hazır olmanızı rica ederiz. Sessiz bir ortam tercih edin.</p>
                  </div>
                  
                  <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
              </div>
              
              <div class="footer">
                  <p>Bu e-posta Uzmanlio sistemi tarafından gönderilmiştir.</p>
              </div>
          </div>
      </body>
      </html>
    `
    };
}

/**
 * Get client notification email for group session
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClientGroupSessionTemplate(data) {
    const { participantName, expertName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink } = data;

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
              
              .content {
                  padding: 40px 30px;
              }
              
              .group-card {
                  background: #F3F7F6;
                  border-radius: 12px;
                  padding: 25px;
                  margin: 25px 0;
                  border-left: 4px solid #009743;
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
              
              .footer {
                  background-color: #f9fafb;
                  padding: 30px;
                  text-align: center;
                  border-top: 1px solid #e5e7eb;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
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
                          ${sessionDuration ? `<p><strong>⏱️ Süre:</strong> ${sessionDuration} dakika</p>` : ''}
                      </div>
                  </div>
                  
                  ${videoLink ? `
                  <div class="join-group">
                      <h3>🎥 Grup Seansına Katıl</h3>
                      <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                      <a href="${videoLink}" class="group-button">Grup Seansına Katıl</a>
                  </div>
                  ` : ''}
                  
                  <div class="important-note">
                      <h4>📋 Grup Seansı Kuralları</h4>
                      <ul style="text-align: left; margin-left: 20px;">
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
 * Get client notification email for package session
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClientPackageSessionTemplate(data) {
    const { participantName, expertName, packageName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink, } = data;

    return {
        subject: "Paket Seansı Daveti - Uzmanlio",
        html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Paket Seansı Daveti</title>
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
              
              .content {
                  padding: 40px 30px;
              }
              
              .package-card {
                  background: #F3F7F6;
                  border-radius: 12px;
                  padding: 25px;
                  margin: 25px 0;
                  border-left: 4px solid #009743;
              }
              
              .package-badge {
                  background: #009743;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  display: inline-block;
                  margin-bottom: 15px;
              }
              
              .join-session {
                  background: #F3F7F6;
                  color: #1f2937;
                  padding: 20px;
                  border-radius: 12px;
                  text-align: center;
                  margin: 25px 0;
                  border: 2px solid #009743;
              }
              
              .session-button {
                  background: #009743;
                  color: white;
                  padding: 15px 30px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  display: inline-block;
                  margin-top: 15px;
              }
              
              .info-box {
                  background: #e0f2fe;
                  border-left: 4px solid #0284c7;
                  border-radius: 8px;
                  padding: 15px;
                  margin: 20px 0;
              }
              
              .important-note {
                  background: #fef3c7;
                  border: 1px solid #f59e0b;
                  border-radius: 8px;
                  padding: 15px;
                  margin: 20px 0;
              }
              
              .footer {
                  background-color: #f9fafb;
                  padding: 30px;
                  text-align: center;
                  border-top: 1px solid #e5e7eb;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎁 Paket Seansı Daveti</h1>
                  <p>Paket seansınız için yeni randevu oluşturuldu!</p>
              </div>
              
              <div class="content">
                  <div class="greeting">
                      Merhaba <strong>${participantName}</strong>,
                  </div>
                  
                  <p><strong>${expertName}</strong> tarafından satın aldığınız paket kapsamında yeni bir seans randevusu oluşturuldu.</p>
                  
                  <div class="package-card">
                      <span class="package-badge">📦 Paket Seansı</span>
                      <h3>📅 Seans Detayları</h3>
                      <div class="appointment-details">
                          ${packageName ? `<p><strong>📦 Paket:</strong> ${packageName}</p>` : ''}
                          <p><strong>📋 Seans Adı:</strong> ${sessionName}</p>
                          <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                          <p><strong>📅 Tarih:</strong> ${sessionDate}</p>
                          <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
                          ${sessionDuration ? `<p><strong>⏱️ Süre:</strong> ${sessionDuration}</p>` : ''}
                      </div>
                  </div>
                  
                  
                  ${videoLink ? `
                  <div class="join-session">
                      <h3>🎥 Seansa Katıl</h3>
                      <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                      <a href="${videoLink}" class="session-button">Seansa Katıl</a>
                  </div>
                  ` : ''}
                  
                  <div class="important-note">
                      <h4>⚠️ Önemli Hatırlatma</h4>
                      <p>Seans başlamadan 10 dakika önce hazır olmanızı rica ederiz. Sessiz bir ortam tercih edin ve internet bağlantınızı kontrol edin.</p>
                  </div>
                  
                  <p style="margin-top: 25px;">Paket seansınızda görüşmek üzere!</p>
                  <p><strong>Uzmanlio</strong></p>
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