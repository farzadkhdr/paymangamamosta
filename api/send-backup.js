// api/send-backup.js
// API Endpoint بۆ ناردنی باکەپ بۆ سیستەمی پەیمانگا
// ئەمە لە Vercel بۆ سیستەمی مامۆستا دادەنرێت

export default async function handler(req, res) {
    // تەنها POST requests قبوڵ دەکەین
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'تەنها POST requests قبوڵ کراوە'
        });
    }

    try {
        const { action, backupData, instituteUrl } = req.body;
        
        // پشکنینی پارامێتەرەکان
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'کردار دیارینەکراوە'
            });
        }
        
        console.log(`🔧 کرداری API: ${action}`);
        
        switch (action) {
            case 'test_connection':
                return await testConnection(instituteUrl, res);
                
            case 'send_backup':
                if (!backupData) {
                    return res.status(400).json({
                        success: false,
                        message: 'داتای باکەپ دیارینەکراوە'
                    });
                }
                return await sendBackup(backupData, instituteUrl, res);
                
            case 'validate_data':
                return await validateData(backupData, res);
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'کرداری نەناسراو'
                });
        }
        
    } catch (error) {
        console.error('❌ هەڵە لە API:', error);
        
        return res.status(500).json({
            success: false,
            message: `هەڵەی ناوەکی: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

// تاقیکردنەوەی پەیوەندی بۆ سیستەمی پەیمانگا
async function testConnection(instituteUrl, res) {
    try {
        const targetUrl = instituteUrl || 'https://paymangaysoranmder.vercel.app/api/backup';
        
        console.log(`🔌 پشکنینی پەیوەندی بۆ: ${targetUrl}`);
        
        const testResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                test: true,
                sourceSystem: "سیستەمی مامۆستا - تاقیکردنەوە",
                backupDate: new Date().toISOString()
            }),
            timeout: 10000 // 10 چرکە
        });
        
        if (testResponse.ok) {
            const result = await testResponse.json();
            
            console.log('✅ پەیوەندی سەرکەوتوو بوو:', result);
            
            return res.status(200).json({
                success: true,
                message: 'پەیوەندی بە سیستەمی پەیمانگا سەرکەوتوو بوو!',
                targetUrl: targetUrl,
                response: result,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('❌ پەیوەندی شکستی هێنا:', testResponse.status);
            
            return res.status(502).json({
                success: false,
                message: `پەیوەندی شکستی هێنا. کۆدی وەڵام: ${testResponse.status}`,
                targetUrl: targetUrl,
                statusCode: testResponse.status,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ هەڵە لە پشکنینی پەیوەندی:', error);
        
        return res.status(503).json({
            success: false,
            message: `نەتوانرا پەیوەندی بکەیت: ${error.message}`,
            error: error.toString(),
            timestamp: new Date().toISOString()
        });
    }
}

// ناردنی باکەپ بۆ سیستەمی پەیمانگا
async function sendBackup(backupData, instituteUrl, res) {
    try {
        const targetUrl = instituteUrl || 'https://paymangaysoranmder.vercel.app/api/backup';
        
        // پێشبینینی داتا
        const validation = validateBackupData(backupData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'داتای باکەپ نادروستە',
                errors: validation.errors,
                timestamp: new Date().toISOString()
            });
        }
        
        // پاککردنەوەی داتا
        const sanitizedData = sanitizeData(backupData);
        
        console.log(`📤 ناردنی باکەپ بۆ: ${targetUrl}`);
        console.log('📊 زانیاری داتا:', {
            students: sanitizedData.students?.length || 0,
            attendance: sanitizedData.attendance?.length || 0
        });
        
        // ناردنی باکەپ
        const sendResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(sanitizedData),
            timeout: 30000 // 30 چرکە بۆ باکەپە گەورەکان
        });
        
        const result = await sendResponse.json();
        
        if (sendResponse.ok && result.success) {
            console.log('✅ باکەپ بە سەرکەوتوویی نێردرا:', result);
            
            return res.status(200).json({
                success: true,
                message: 'باکەپ بە سەرکەوتوویی نێردرا بۆ سیستەمی پەیمانگا!',
                targetUrl: targetUrl,
                sentData: {
                    students: sanitizedData.students?.length || 0,
                    attendance: sanitizedData.attendance?.length || 0
                },
                instituteResponse: result,
                timestamp: new Date().toISOString(),
                backupId: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
        } else {
            console.error('❌ ناردنی باکەپ شکستی هێنا:', result);
            
            return res.status(sendResponse.status || 500).json({
                success: false,
                message: `ناردنی باکەپ شکستی هێنا: ${result.message || 'هەڵەی نەزانراو'}`,
                targetUrl: targetUrl,
                instituteResponse: result,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ هەڵە لە ناردنی باکەپ:', error);
        
        return res.status(503).json({
            success: false,
            message: `نەتوانرا باکەپ بنێردرێت: ${error.message}`,
            error: error.toString(),
            timestamp: new Date().toISOString()
        });
    }
}

// پشکنینی داتای باکەپ
async function validateData(backupData, res) {
    try {
        const validation = validateBackupData(backupData);
        
        if (validation.isValid) {
            // پشکنینی زیاتر
            const details = {
                totalStudents: backupData.students?.length || 0,
                totalAttendance: backupData.attendance?.length || 0,
                hasStudents: !!(backupData.students && backupData.students.length > 0),
                hasAttendance: !!(backupData.attendance && backupData.attendance.length > 0),
                backupDate: backupData.backupDate || 'دیارینەکراو',
                sourceSystem: backupData.sourceSystem || 'نەناسراو'
            };
            
            // پشکنینی قوتابیەکان
            const studentErrors = [];
            if (backupData.students) {
                backupData.students.forEach((student, index) => {
                    if (!student.id) studentErrors.push(`قوتابی ${index + 1}: ID نییە`);
                    if (!student.name) studentErrors.push(`قوتابی ${index + 1}: ناو نییە`);
                });
            }
            
            // پشکنینی غیابەکان
            const attendanceErrors = [];
            if (backupData.attendance) {
                backupData.attendance.forEach((att, index) => {
                    if (!att.id) attendanceErrors.push(`غیاب ${index + 1}: ID نییە`);
                    if (!att.studentId) attendanceErrors.push(`غیاب ${index + 1}: IDی قوتابی نییە`);
                });
            }
            
            const allErrors = [...studentErrors, ...attendanceErrors];
            
            return res.status(200).json({
                success: true,
                message: allErrors.length === 0 ? 'داتا درووستە' : 'داتا درووستە بە هەندێک هەڵە',
                validation: validation,
                details: details,
                errors: allErrors,
                timestamp: new Date().toISOString()
            });
            
        } else {
            return res.status(400).json({
                success: false,
                message: 'داتای باکەپ نادروستە',
                validation: validation,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ هەڵە لە پشکنینی داتا:', error);
        
        return res.status(500).json({
            success: false,
            message: `هەڵە لە پشکنینی داتا: ${error.message}`,
            error: error.toString(),
            timestamp: new Date().toISOString()
        });
    }
}

// Helper functions
function validateBackupData(data) {
    const errors = [];
    
    if (!data) {
        errors.push('داتا بەتاڵە');
        return { isValid: false, errors };
    }
    
    if (data.students && !Array.isArray(data.students)) {
        errors.push('لیستی قوتابیان نادروستە (پێویستە Array بێت)');
    }
    
    if (data.attendance && !Array.isArray(data.attendance)) {
        errors.push('لیستی غیابات نادروستە (پێویستە Array بێت)');
    }
    
    // پشکنینی قۆناغەکان
    if (data.students) {
        data.students.forEach((student, index) => {
            if (!student.id && !student.name) {
                errors.push(`قوتابی ${index + 1}: نە ID هەیە نە ناو`);
            }
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function sanitizeData(data) {
    // زیادکردنی metadata
    const sanitized = {
        ...data,
        processedAt: new Date().toISOString(),
        processor: 'سیستەمی مامۆستا API',
        apiVersion: '1.0'
    };
    
    // پاککردنەوەی قوتابیەکان
    if (sanitized.students && Array.isArray(sanitized.students)) {
        sanitized.students = sanitized.students.map(student => ({
            ...student,
            id: student.id?.toString() || `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: student.name?.trim() || 'ناوی دیارینەکراو',
            processed: true
        }));
    }
    
    // پاککردنەوەی غیابەکان
    if (sanitized.attendance && Array.isArray(sanitized.attendance)) {
        sanitized.attendance = sanitized.attendance.map(attendance => ({
            ...attendance,
            id: attendance.id?.toString() || `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            studentId: attendance.studentId?.toString(),
            timestamp: attendance.timestamp || new Date().toISOString(),
            processed: true
        }));
    }
    
    return sanitized;
}

// Middleware configuration
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        },
        responseLimit: false,
        externalResolver: true,
    },
};
