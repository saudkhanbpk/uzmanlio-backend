// Event Email Templates for Expert and Clients

/**
 * Get expert notification email when they create a new event (bireysel)
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
                    ${serviceName ? `<div class="detail-item">
                        <div class="detail-label">Hizmet:</div>
                        <div class="detail-value">${serviceName}</div>
                    </div>` : ''}
                    <div class="detail-item">
                        <div class="detail-label">Danışan:</div>
                        <div class="detail-value">${clientName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${eventDate || 'Belirtilmedi'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${eventTime || 'Belirtilmedi'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Yer:</div>
                        <div class="detail-value">${eventLocation || 'Online'}</div>
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
 * Get client notification email for 1-1 session (bireysel)
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClient11SessionTemplate(data) {
    const { participantName, expertName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink } = data;

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
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Randevunuz Oluşturuldu!</h1>
            <p>Randevu detaylarınız aşağıda yer almaktadır</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${participantName}</strong>,
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
                        <div class="detail-value">${sessionName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tarih:</div>
                        <div class="detail-value">${sessionDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Saat:</div>
                        <div class="detail-value">${sessionTime}</div>
                    </div>
                    ${sessionDuration ? `<div class="detail-item">
                        <div class="detail-label">Süre:</div>
                        <div class="detail-value">${sessionDuration} dakika</div>
                    </div>` : ''}
                    <div class="detail-item">
                        <div class="detail-label">Yer:</div>
                        <div class="detail-value">Online</div>
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
 * Get client notification email for group session
 * Sends BOTH group session invite AND participation confirmation
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClientGroupSessionTemplate(data) {
    const { participantName, expertName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink } = data;

    // Combined template - includes both invite and confirmation info
    return {
        subject: "Randevunuz Oluşturuldu - Uzmanlio",
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
            <h1>Randevunuz Oluşturuldu!</h1>
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
            <div class="join-group" style="border-color: ${videoLink.includes('zoom.us') ? '#2D8CFF' : '#009743'};">
                <h3>🎥 Grup Seansına Katıl</h3>
                <p>Seans saatinde aşağıdaki bağlantıya tıklayarak katılabilirsiniz:</p>
                <a href="${videoLink}" class="group-button" style="color: white; background-color: ${videoLink.includes('zoom.us') ? '#2D8CFF' : '#009743'};">
                    ${videoLink.includes('zoom.us') ? '🔵 Zoom Toplantısına Katıl' : 'Grup Seansına Katıl'}
                </a>
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
 * Get second group session confirmation template
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getGroupSessionConfirmationTemplate(data) {
    const { participantName, sessionName, sessionDate, sessionTime, videoLink } = data;
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
 * Get client notification email for package session usage
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClientPackageSessionTemplate(data) {
    const { participantName, expertName, packageName, sessionName, sessionDate, sessionTime, sessionDuration, videoLink, usedSessions, remainingSessions } = data;
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
            transition: width 0.3s ease;
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
                Merhaba <strong>${participantName}</strong>,
            </div>
            
            <p><strong>${packageName || sessionName}</strong> paketinizden seans hakkı kullanıldı. Kullanım detayları aşağıdaki gibidir:</p>
            
            <div class="usage-card">
                <h3>📋 Kullanım Detayları</h3>
                <div class="appointment-details">
                    <p><strong>👨‍💼 Uzman:</strong> ${expertName}</p>
                    <p><strong>📅 Randevu Tarihi:</strong> ${sessionDate}</p>
                    <p><strong>⏰ Saat:</strong> ${sessionTime}</p>
                    <p><strong>📊 Kullanım Tarihi:</strong> ${usageDate}</p>
                    ${sessionDuration ? `<p><strong>⏱️ Süre:</strong> ${sessionDuration} dakika</p>` : ''}
                </div>
            </div>
            
            ${remainingSessions !== undefined ? `
            <div class="session-progress">
                <h4>📈 Paket Durumu</h4>
                <div class="remaining-highlight">${remainingSessions}</div>
                <p>Kalan Seans Hakkı</p>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">Paket: ${packageName || sessionName}</p>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>📋 Seans Hakkı Bilgileri</h4>
                <ul>
                    ${usedSessions ? `<li>Toplam kullanılan seans: ${usedSessions}</li>` : ''}
                    ${remainingSessions !== undefined ? `<li>Kalan seans hakkı: ${remainingSessions}</li>` : ''}
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
 * Get client appointment created template (same as bireysel but used for package events)
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getClientAppointmentCreatedTemplate(data) {
    const { clientName, expertName, appointmentDate, appointmentTime, appointmentLocation, videoLink } = data;

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
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>Randevunuz Oluşturuldu!</h1>
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
                        <div class="detail-value">${appointmentLocation || 'Online'}</div>
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
 * Get client notification email when event is updated
 * @param {object} data - Event data
 * @returns {object} Email subject and HTML body
 */
export function getEventUpdatedTemplate(data) {
    const { clientName, expertName, newDate, newTime, appointmentLocation, videoLink } = data;

    return {
        subject: "Randevu Güncellendi - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Güncellendi</title>
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
        
        .change-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
        }
        
        .new-info {
            background: #dcfce7;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            border-left: 3px solid #22c55e;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://uzmanlio.com/images/logo.png" alt="Uzmanlio" class="logo">
            <h1>🔄 Randevu Güncellendi</h1>
            <p>Randevu bilgilerinizde değişiklik yapılmıştır</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${clientName}</strong>,
            </div>
            
            <p><strong>${expertName}</strong> ile olan randevunuzda değişiklik yapılmıştır. Yeni randevu bilgileri aşağıdadır:</p>
            
            <div class="change-card">
                <h3>📅 Randevu Değişiklikleri</h3>
                
                <div class="new-info">
                    <strong>✅ Yeni Bilgiler:</strong><br>
                    Tarih: ${newDate}<br>
                    Saat: ${newTime}<br>
                    Yer: ${appointmentLocation || 'Online'}
                </div>
                
                ${videoLink ? `<a href="${videoLink}" class="video-link" style="color: white;">🎥 Video Konferansa Katıl</a>` : ''}
            </div>
            
            <div class="important-note">
                <h4>⚠️ Önemli Hatırlatma</h4>
                <p>Lütfen takvimimizi yeni tarih ve saat bilgisine göre güncelleyin. Herhangi bir sorunuz varsa uzmanınızla iletişime geçebilirsiniz.</p>
            </div>
            
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
 * Get reminder email template for event reminder (2 hours before)
 * @param {object} data - Event and recipient data
 * @returns {object} Email subject and HTML body
 */
export function getReminderEmailTemplate(data) {
    const { recipientName, otherPerson, appointmentTime, appointmentLocation, videoLink } = data;

    return {
        subject: "⏰ Randevu Hatırlatması - 2 Saat Kaldı - Uzmanlio",
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Hatırlatması</title>
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
        
        .reminder-card {
            background: #F3F7F6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #009743;
            text-align: center;
        }
        
        .countdown {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin: 20px 0;
        }
        
        .appointment-details p {
            margin: 10px 0;
            font-size: 15px;
        }
        
        .quick-join {
            background: #F3F7F6;
            color: #1f2937;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            border: 2px solid #009743;
        }
        
        .join-button {
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
            <h1>⏰ Randevu Hatırlatması</h1>
            <p>Randevunuza az kaldı!</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Merhaba <strong>${recipientName}</strong>,
            </div>
            
            <div class="reminder-card">
                <h2>🕐 Randevunuza</h2>
                <div class="countdown">2 SAAT</div>
                <h2>kaldı!</h2>
            </div>
            
            <p><strong>${otherPerson}</strong> ile olan randevunuz çok yaklaştı. Detayları hatırlatmak isteriz:</p>
            
            <div class="appointment-details">
                <p><strong>⏰ Saat:</strong> ${appointmentTime}</p>
                <p><strong>📍 Yer:</strong> ${appointmentLocation || 'Online'}</p>
            </div>
            
            ${videoLink ? `
            <div class="quick-join">
                <h3>🎥 Hızlı Katılım</h3>
                <p>Video konferansa tek tıkla katılabilirsiniz:</p>
                <a href="${videoLink}" class="join-button" style="color: white;">Şimdi Katıl</a>
            </div>
            ` : ''}
            
            <div class="important-note">
                <h4>✅ Hazırlık Kontrol Listesi:</h4>
                <ul>
                    <li>İnternet bağlantınızı kontrol edin</li>
                    <li>Kamera ve mikrofonunuzu test edin</li>
                    <li>Sessiz bir ortam hazırlayın</li>
                    <li>Gerekli belgeleri yanınıza alın</li>
                </ul>
            </div>
            
            <p style="margin-top: 25px;"><strong>Uzmanlio</strong></p>
        </div>
        
        <div class="footer">
            <p>Bu e-posta Uzmanlio hatırlatma sistemi tarafından gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `
    };
}