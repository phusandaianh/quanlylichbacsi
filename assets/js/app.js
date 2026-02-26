
        // =========================
        // Core: Storage (tối ưu bảo trì)
        // - Gom key localStorage vào 1 chỗ
        // - Parse JSON an toàn (tránh crash khi dữ liệu lỗi)
        // =========================
        const STORAGE_KEYS = Object.freeze({
            // Leave / doctors
            leaveSubmissions: 'leaveSubmissions',
            doctorsLanhdao: 'doctorsLanhdao',
            doctorscot1: 'doctorscot1',
            doctorscot2: 'doctorscot2',
            doctorscot3: 'doctorscot3',
            doctorsPartime: 'doctorsPartime',
            doctorsKhac: 'doctorsKhac',

            // Accounts / permissions
            accounts: 'accounts',
            passwordRequests: 'passwordRequests',
            currentUser: 'currentUser',
            permissions: 'permissions',
            permissionTabs: 'permissionTabs',

            // Nghỉ phép
            quanlynghiphepData: 'quanlynghiphepData',
            maxCountByWeekday: 'maxCountByWeekday',
            fixedScheduleData: 'fixedScheduleData',
            holidayMarkedDates: 'holidayMarkedDates',
            holidayLabels: 'holidayLabels',
            
            // Ngày công làm việc
            ngaycongData: 'ngaycongData',
            workShifts: 'workShifts', // Danh sách ca làm việc: [{ id, name, workValue }, ...]

            // Lịch làm việc
            lichlamviecData: 'lichlamviecData',

            // Other (để không phá hành vi hiện tại)
            quydinhData: 'quydinhData',
            cvcot1Data: 'cvcot1Data',
            cvcot23Data: 'cvcot23Data',
            khamhotropkData: 'khamhotropkData',
            khamsomData: 'khamsomData',
            khamcaugiayData: 'khamcaugiayData',
            khamcaugiayDoctorList: 'khamcaugiayDoctorList',
            khamcaugiayBaoHiem: 'khamcaugiayBaoHiem',
            khamcaugiayRooms: 'khamcaugiayRooms',
            khamcaugiay20hData: 'khamcaugiay20hData',
            khamlongbienData: 'khamlongbienData',
            khamlongbienRooms: 'khamlongbienRooms',
            khamsanvipData: 'khamsanvipData',
            sieuamvipData: 'sieuamvipData',
            tructruaData: 'tructruaData',
            tieuphauData: 'tieuphauData',
            tructhuongtruData: 'tructhuongtruData',
            tructhuongtruDoctorList: 'tructhuongtruDoctorList',
            lichTrucData: 'lichTrucData',
            lamviechangngayData: 'lamviechangngayData',
            lamviechangngayDoctorList: 'lamviechangngayDoctorList',
            lamviechangngayRooms: 'lamviechangngayRooms',
            lamviechangngayRoomsCauGiay: 'lamviechangngayRoomsCauGiay',
            lamviechangngayRoomsLongBien: 'lamviechangngayRoomsLongBien',
            phumoData: 'phumoData',
            phumoDoctorList: 'phumoDoctorList',
            livetreamData: 'livetreamData',
            livetreamDoctorList: 'livetreamDoctorList',
            tang4Data: 'tang4Data',
            tang4Notes: 'tang4Notes',
            hoichancot1ScheduleData: 'hoichancot1ScheduleData'
        });

        // Ánh xạ type bác sĩ -> key localStorage (để lưu/load từng nhóm)
        const DOCTOR_TYPE_STORAGE = {
            lanhdao: STORAGE_KEYS.doctorsLanhdao,
            cot1: STORAGE_KEYS.doctorscot1,
            cot2: STORAGE_KEYS.doctorscot2,
            cot3: STORAGE_KEYS.doctorscot3,
            partime: STORAGE_KEYS.doctorsPartime,
            khac: STORAGE_KEYS.doctorsKhac
        };
        function saveDoctorsGroupToStorage(type) {
            const key = DOCTOR_TYPE_STORAGE[type];
            if (key) StorageUtil.saveJson(key, doctors[type] || []);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        const StorageUtil = {
            loadJson(key, fallback) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw === null || raw === undefined || raw === '') return fallback;
                    return JSON.parse(raw);
                } catch (e) {
                    console.warn(`⚠️ Dữ liệu localStorage lỗi ở key="${key}", dùng fallback.`, e);
                    return fallback;
                }
            },
            saveJson(key, value) {
                try {
                    const str = JSON.stringify(value);
                    localStorage.setItem(key, str);
                } catch (e) {
                    console.error('⚠️ Lỗi khi lưu localStorage key="' + key + '":', e);
                }
            },
            loadString(key, fallback = '') {
                const v = localStorage.getItem(key);
                return (v === null || v === undefined) ? fallback : v;
            },
            remove(key) {
                localStorage.removeItem(key);
            }
        };

        const API_BASE_URL = 'http://localhost:8001/api';
        // Bật true để load/ghi dữ liệu qua database (cùng server phục vụ tại /api)
        const USE_DATABASE_BACKEND = true;
        // Base URL cho API storage: '' = same-origin (localhost hoặc domain hiện tại)
        // Ví dụ production: 'https://quanlylichbacsi.onrender.com' nếu frontend chạy domain khác
        const STORAGE_API_BASE = '';
        // true = ghi nhớ đăng nhập (đã đăng nhập trang chủ thì mở các trang khác vẫn giữ phiên)
        const RESTORE_SESSION = true;

        async function apiRequest(path, options = {}) {
            try {
                const url = `${API_BASE_URL}${path}`;
                const defaultHeaders = {
                    'Content-Type': 'application/json'
                };
                const fetchOptions = {
                    method: 'GET',
                    ...options,
                    headers: { ...defaultHeaders, ...(options.headers || {}) }
                };
                const res = await fetch(url, fetchOptions);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
                }
                if (res.status === 204) return null;
                return await res.json();
            } catch (e) {
                console.error('apiRequest lỗi:', path, e);
                throw e;
            }
        }

        // Lấy dữ liệu từ localStorage khi trang tải - TẤT CẢ DỮ LIỆU ĐƯỢC LƯU VÀ KHÔNG BỊ MẤT
        let submissions = StorageUtil.loadJson(STORAGE_KEYS.leaveSubmissions, []);
        let doctors = {
            lanhdao: StorageUtil.loadJson(STORAGE_KEYS.doctorsLanhdao, []),
            cot1: StorageUtil.loadJson(STORAGE_KEYS.doctorscot1, []),
            cot2: StorageUtil.loadJson(STORAGE_KEYS.doctorscot2, []),
            cot3: StorageUtil.loadJson(STORAGE_KEYS.doctorscot3, []),
            partime: StorageUtil.loadJson(STORAGE_KEYS.doctorsPartime, []),
            khac: StorageUtil.loadJson(STORAGE_KEYS.doctorsKhac, [])
        };

        // Quản lý tài khoản
        let accounts = StorageUtil.loadJson(STORAGE_KEYS.accounts, {});
        let passwordRequests = StorageUtil.loadJson(STORAGE_KEYS.passwordRequests, []);
        let currentUser = StorageUtil.loadJson(STORAGE_KEYS.currentUser, null);
        
        // Phân quyền chỉnh sửa: { doctorKey: { tabName: true/false } }
        let permissions = StorageUtil.loadJson(STORAGE_KEYS.permissions, {});
        
        // cv cột2+3data
        let cvcot23Data = StorageUtil.loadJson(STORAGE_KEYS.cvcot23Data, []);
        
        // cv cột1 data
        let cvcot1Data = StorageUtil.loadJson(STORAGE_KEYS.cvcot1Data, []);
        
        // Khám hỗ trợ PK data
        let khamhotropkData = StorageUtil.loadJson(STORAGE_KEYS.khamhotropkData, []);
        
        // Lịch khám sớm data - lưu theo format: { "YYYY-MM-DD": "Tên bác sĩ" }
        let khamsomData = StorageUtil.loadJson(STORAGE_KEYS.khamsomData, {});
        
        // Lịch khám Cầu Giấy - format: { "YYYY-MM-DD": { "roomId": "doctorKey", ... } }, 6 phòng/ngày
        let khamcaugiayData = StorageUtil.loadJson(STORAGE_KEYS.khamcaugiayData, {});
        let khamcaugiayDoctorList = StorageUtil.loadJson(STORAGE_KEYS.khamcaugiayDoctorList, []);
        let khamcaugiayBaoHiem = StorageUtil.loadJson(STORAGE_KEYS.khamcaugiayBaoHiem, {}); // { "doctorKey": ["2025-02", "2025-03", ...] }
        let khamcaugiayRooms = StorageUtil.loadJson(STORAGE_KEYS.khamcaugiayRooms, [
            { id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' }, { id: 'r3', name: 'Phòng 3' },
            { id: 'r4', name: 'Phòng 4' }, { id: 'r5', name: 'Phòng 5' }, { id: 'r6', name: 'Phòng 6' }
        ]);
        if (!Array.isArray(khamcaugiayRooms) || khamcaugiayRooms.length === 0) {
            khamcaugiayRooms = [
                { id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' }, { id: 'r3', name: 'Phòng 3' },
                { id: 'r4', name: 'Phòng 4' }, { id: 'r5', name: 'Phòng 5' }, { id: 'r6', name: 'Phòng 6' }
            ];
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayRooms, khamcaugiayRooms);
        }
        (function migrateKhamCauGiayRoomsOptions() {
            let changed = false;
            (khamcaugiayRooms || []).forEach(r => {
                if (r.khamTrua === undefined) { r.khamTrua = false; changed = true; }
                if (r.kham20h === undefined) { r.kham20h = false; changed = true; }
            });
            if (changed) StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayRooms, khamcaugiayRooms);
        })();
        // Migration: format cũ { date: "doctorName" } -> { date: { r1: "doctorKey" } }
        (function migrateKhamCauGiayData() {
            let changed = false;
            for (const key in khamcaugiayData) {
                const v = khamcaugiayData[key];
                if (typeof v === 'string' && v.trim()) {
                    const firstRoom = (khamcaugiayRooms[0] && khamcaugiayRooms[0].id) || 'r1';
                    const doctorKey = normalizeKey(v.trim());
                    khamcaugiayData[key] = { [firstRoom]: doctorKey };
                    changed = true;
                }
            }
            if (changed) StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
        })();
        // Migration: format { roomId: "doctorKey" } -> { roomId: { doctor, khamTrua, kham20h } }
        (function migrateKhamCauGiaySlotFormat() {
            let changed = false;
            for (const key in khamcaugiayData) {
                const dayData = khamcaugiayData[key];
                if (!dayData || typeof dayData !== 'object') continue;
                for (const rid in dayData) {
                    const v = dayData[rid];
                    if (typeof v === 'string') {
                        dayData[rid] = { doctor: v.trim(), khamTrua: false, kham20h: false };
                        changed = true;
                    }
                }
            }
            if (changed) StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
        })();
        let khamcaugiay20hData = StorageUtil.loadJson(STORAGE_KEYS.khamcaugiay20hData, {});
        (function migrateKhamCauGiay20hData() {
            let changed = false;
            for (const key in khamcaugiay20hData) {
                const v = khamcaugiay20hData[key];
                if (typeof v === 'string') {
                    khamcaugiay20hData[key] = { trua: '', buoi20h: (v || '').trim() };
                    changed = true;
                } else if (v && typeof v === 'object' && (v.trua === undefined || v.buoi20h === undefined)) {
                    khamcaugiay20hData[key] = { trua: (v.trua || '').trim(), buoi20h: (v.buoi20h || (v['20h'] || '')).trim() };
                    changed = true;
                }
            }
            if (changed) StorageUtil.saveJson(STORAGE_KEYS.khamcaugiay20hData, khamcaugiay20hData);
        })();
        let khamlongbienData = StorageUtil.loadJson(STORAGE_KEYS.khamlongbienData, {});
        let khamlongbienRooms = StorageUtil.loadJson(STORAGE_KEYS.khamlongbienRooms, [
            { id: 'r1', name: 'Phòng 1' },
            { id: 'r2', name: 'Phòng 2' },
            { id: 'r3', name: 'Phòng 3' },
            { id: 'r4', name: 'Phòng 4' },
            { id: 'r5', name: 'Phòng 5' },
            { id: 'r6', name: 'Phòng 6' },
            { id: 'r7', name: 'Phòng 7' },
            { id: 'r8', name: 'Phòng 8' },
            { id: 'r9', name: 'Phòng 9' },
            { id: 'r10', name: 'Phòng 10' }
        ]);
        if (!Array.isArray(khamlongbienRooms) || khamlongbienRooms.length === 0) {
            khamlongbienRooms = [
                { id: 'r1', name: 'Phòng 1' },
                { id: 'r2', name: 'Phòng 2' },
                { id: 'r3', name: 'Phòng 3' },
                { id: 'r4', name: 'Phòng 4' },
                { id: 'r5', name: 'Phòng 5' },
                { id: 'r6', name: 'Phòng 6' },
                { id: 'r7', name: 'Phòng 7' },
                { id: 'r8', name: 'Phòng 8' },
                { id: 'r9', name: 'Phòng 9' },
                { id: 'r10', name: 'Phòng 10' }
            ];
            StorageUtil.saveJson(STORAGE_KEYS.khamlongbienRooms, khamlongbienRooms);
        }
        
        // Lịch khám sản VIP / siêu âm VIP - lưu theo format: { "YYYY-MM-DD": { morning: "", afternoon: "" } }
        let khamsanvipData = StorageUtil.loadJson(STORAGE_KEYS.khamsanvipData, {});
        let sieuamvipData = StorageUtil.loadJson(STORAGE_KEYS.sieuamvipData, {});
        
        // Lịch trực trưa data - lưu theo format: { "YYYY-MM-DD": "Tên bác sĩ" }
        let tructruaData = StorageUtil.loadJson(STORAGE_KEYS.tructruaData, {});
        
        // Lịch tiểu phẫu data - lưu theo format: { "YYYY-MM-DD": "Tên bác sĩ" }
        let tieuphauData = StorageUtil.loadJson(STORAGE_KEYS.tieuphauData, {});
        
        // Quản lý nghỉ phép data - lưu danh sách nghỉ theo cột: { "YYYY-MM-DD": { c1: { doctors: [{key, period}], maxCount: 0 }, c2: {...}, c3: {...} } }
        let quanlynghiphepData = StorageUtil.loadJson(STORAGE_KEYS.quanlynghiphepData, {});
        
        // Ngày công làm việc data - lưu theo format: { "doctorKey": { "YYYY-MM-DD": { workShift: "morning"|"afternoon"|"full"|"off", leaveShift: "morning"|"afternoon"|"full"|null } } }
        let ngaycongData = StorageUtil.loadJson(STORAGE_KEYS.ngaycongData, {});
        
        // Danh sách ca làm việc - lưu theo format: [{ id: 1, name: "Ca sáng", workValue: 0.5 }, { id: 2, name: "Ca chiều", workValue: 0.5 }, ...]
        let workShifts = StorageUtil.loadJson(STORAGE_KEYS.workShifts, [
            { id: 1, name: "Ca sáng", workValue: 0.5 },
            { id: 2, name: "Ca chiều", workValue: 0.5 },
            { id: 3, name: "Ca cả ngày", workValue: 1.0 },
            { id: 4, name: "Nghỉ phép", workValue: 0 }
        ]);
        
        // Migration: Chuyển đổi format cũ (string array) sang format mới (object array)
        function migrateQuanLyNghiPhepData() {
            let hasChanges = false;
            for (const dateKey in quanlynghiphepData) {
                const dayData = quanlynghiphepData[dateKey];
                if (!dayData || typeof dayData !== 'object') continue;
                
                ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                    let colData = dayData[col];
                    if (!colData) return;
                    
                    // Nếu là array (format cũ), chuyển sang object
                    if (Array.isArray(colData)) {
                        dayData[col] = {
                            doctors: colData.map(key => ({ key: key, period: 'full' })),
                            maxCount: 0
                        };
                        hasChanges = true;
                    } else if (typeof colData === 'object') {
                        // Nếu doctors là array, kiểm tra và chuyển đổi
                        if (Array.isArray(colData.doctors)) {
                            const migratedDoctors = colData.doctors.map(item => {
                                // Nếu đã là object format mới, giữ nguyên
                                if (item && typeof item === 'object' && item.key) {
                                    return { key: item.key, period: item.period || 'full' };
                                }
                                // Nếu là string (format cũ), chuyển sang object
                                if (typeof item === 'string') {
                                    return { key: item, period: 'full' };
                                }
                                return null;
                            }).filter(item => item !== null);
                            
                            if (migratedDoctors.length !== colData.doctors.length || 
                                colData.doctors.some((item, idx) => {
                                    const migrated = migratedDoctors[idx];
                                    return typeof item === 'string' || (item && typeof item === 'object' && !item.key);
                                })) {
                                colData.doctors = migratedDoctors;
                                hasChanges = true;
                            }
                        } else if (colData.doctors && typeof colData.doctors !== 'undefined') {
                            // Nếu doctors không phải array, khởi tạo lại
                            colData.doctors = [];
                            hasChanges = true;
                        }
                    }
                });
            }
            
            if (hasChanges) {
                StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
                console.log('✅ Đã chuyển đổi dữ liệu nghỉ phép sang format mới');
            }
        }
        
        // Chạy migration khi trang tải
        migrateQuanLyNghiPhepData();
        
        // Dữ liệu số lượng bác sĩ được nghỉ phép theo ngày trong tuần (Thứ 2 - Thứ 7)
        // Format: { c1: { 1: 2, 2: 2, ..., 6: 2 }, c2: {...}, c3: {...} }
        // weekday: 1 = Thứ 2, 2 = Thứ 3, ..., 6 = Thứ 7
        let maxCountByWeekday = StorageUtil.loadJson(STORAGE_KEYS.maxCountByWeekday, {
            ld: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            c1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            c2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            c3: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        });
        if (!maxCountByWeekday.ld) {
            maxCountByWeekday.ld = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            StorageUtil.saveJson(STORAGE_KEYS.maxCountByWeekday, maxCountByWeekday);
        }
        
        function saveMaxCountByWeekday() {
            StorageUtil.saveJson(STORAGE_KEYS.maxCountByWeekday, maxCountByWeekday);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        function getMaxCountForWeekday(column, weekday) {
            // weekday: 1 = Thứ 2, 2 = Thứ 3, ..., 6 = Thứ 7
            if (maxCountByWeekday[column] && maxCountByWeekday[column][weekday] !== undefined) {
                return maxCountByWeekday[column][weekday];
            }
            return 0;
        }
        
        // Dữ liệu lịch nghỉ cố định theo từng cộtvà từng ngày trong tuần
        // Format: { c1: { 1: [{ key: 'doctorKey', period: 'full' }], 2: [...], ..., 6: [...] }, c2: {...}, c3: {...} }
        // weekday: 1 = Thứ 2, 2 = Thứ 3, ..., 6 = Thứ 7
        let fixedScheduleData = StorageUtil.loadJson(STORAGE_KEYS.fixedScheduleData, {
            ld: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
            c1: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
            c2: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
            c3: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
        });
        // Đảm bảo ld tồn tại (migration cho dữ liệu cũ)
        if (!fixedScheduleData.ld) {
            fixedScheduleData.ld = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
            saveFixedScheduleData();
        }
        
        function saveFixedScheduleData() {
            StorageUtil.saveJson(STORAGE_KEYS.fixedScheduleData, fixedScheduleData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        function getFixedScheduleForWeekday(column, weekday) {
            // weekday: 1 = Thứ 2, 2 = Thứ 3, ..., 6 = Thứ 7
            if (fixedScheduleData[column] && fixedScheduleData[column][weekday]) {
                return fixedScheduleData[column][weekday];
            }
            return [];
        }
        
        // Ngày nghỉ lễ được đánh dấu (user chọn) - array ["YYYY-MM-DD", ...]
        let holidayMarkedDates = StorageUtil.loadJson(STORAGE_KEYS.holidayMarkedDates, []);
        if (!Array.isArray(holidayMarkedDates)) holidayMarkedDates = [];
        // Nhãn tùy chỉnh cho từng ngày - { "YYYY-MM-DD": "Tên lễ" }
        let holidayLabels = StorageUtil.loadJson(STORAGE_KEYS.holidayLabels, {});
        if (!holidayLabels || typeof holidayLabels !== 'object') holidayLabels = {};
        function saveHolidayMarkedDates() {
            StorageUtil.saveJson(STORAGE_KEYS.holidayMarkedDates, holidayMarkedDates);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        function saveHolidayLabels() {
            StorageUtil.saveJson(STORAGE_KEYS.holidayLabels, holidayLabels);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        // NOTE: Đã bỏ migration IIFE trùng để tránh chạy 2 lần / ghi đè format.
        // Migration chính được thực hiện bởi `migrateQuanLyNghiPhepData()` ở phía trên.
        
        // Lịch trực thường trú data
        let tructhuongtruData = StorageUtil.loadJson(STORAGE_KEYS.tructhuongtruData, {
            thu2: '',
            thu3: '',
            thu4: '',
            thu5: '',
            thu6: '',
            thu7: '',
            cn: ''
        });
        // Danh sách bác sĩ trực thường trú (tick chọn từ danh sách toàn bộ) - mảng tên bác sĩ
        let tructhuongtruDoctorList = StorageUtil.loadJson(STORAGE_KEYS.tructhuongtruDoctorList, []);
        
        // Lịch trực data: { "YYYY-MM-DD": { c1: { day, night }, c2: {...}, c3: {...}, truc1630: doctorKey } } - truc1630 1 dòng chung cho Thứ 7
        let lichTrucData = StorageUtil.loadJson(STORAGE_KEYS.lichTrucData, {});
        
        // Lịch khám chủ nhật data - lưu theo format: { "YYYY-MM-DD": { "sang_caugiay": "doctor names", "sang_longbien": "doctor names", "chieu_caugiay": "doctor names", "chieu_longbien": "doctor names" } }
        let lamviechangngayData = StorageUtil.loadJson(STORAGE_KEYS.lamviechangngayData, {});
        // Danh sách bác sĩ khám chủ nhật (tick chọn từ danh sách toàn bộ) - mảng tên bác sĩ
        let lamviechangngayDoctorList = StorageUtil.loadJson(STORAGE_KEYS.lamviechangngayDoctorList, []);
        // Phòng khám chủ nhật (giống lịch khám Cầu Giấy): [{ id, name }, ...] — giữ để tương thích cũ
        let lamviechangngayRooms = StorageUtil.loadJson(STORAGE_KEYS.lamviechangngayRooms, [
            { id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' },
            { id: 'r3', name: 'Phòng 3' }, { id: 'r4', name: 'Phòng 4' }
        ]);
        if (!Array.isArray(lamviechangngayRooms) || lamviechangngayRooms.length === 0) {
            lamviechangngayRooms = [
                { id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' },
                { id: 'r3', name: 'Phòng 3' }, { id: 'r4', name: 'Phòng 4' }
            ];
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRooms, lamviechangngayRooms);
        }
        // Phòng khám chủ nhật: Cầu Giấy và Long Biên riêng (mỗi bên 1–3 phòng)
        let lamviechangngayRoomsCauGiay = StorageUtil.loadJson(STORAGE_KEYS.lamviechangngayRoomsCauGiay, null);
        let lamviechangngayRoomsLongBien = StorageUtil.loadJson(STORAGE_KEYS.lamviechangngayRoomsLongBien, null);
        if (!Array.isArray(lamviechangngayRoomsCauGiay) || lamviechangngayRoomsCauGiay.length === 0) {
            lamviechangngayRoomsCauGiay = (lamviechangngayRooms || []).slice(0, 2).map((r, i) => ({ id: r.id || 'cg' + (i + 1), name: r.name || 'Phòng ' + (i + 1) }));
            if (lamviechangngayRoomsCauGiay.length === 0) lamviechangngayRoomsCauGiay = [{ id: 'cg1', name: 'Phòng 1' }];
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsCauGiay, lamviechangngayRoomsCauGiay);
        }
        if (!Array.isArray(lamviechangngayRoomsLongBien) || lamviechangngayRoomsLongBien.length === 0) {
            lamviechangngayRoomsLongBien = (lamviechangngayRooms || []).slice(2, 4).map((r, i) => ({ id: r.id || 'lb' + (i + 1), name: r.name || 'Phòng ' + (i + 1) }));
            if (lamviechangngayRoomsLongBien.length === 0) lamviechangngayRoomsLongBien = [{ id: 'lb1', name: 'Phòng 1' }];
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsLongBien, lamviechangngayRoomsLongBien);
        }
        
        // Lịch làm việc data - lưu theo format: { "YYYY-MM-DD": { "positionId": { "shift": "doctor names" } } }
        let lichlamviecData = StorageUtil.loadJson(STORAGE_KEYS.lichlamviecData, {});
        
        // Lịch phụ mổ data - format: { rows: [{ thu2, thu3, thu4, thu5, thu6, thu7 }, ...], notes: '' }
        function normalizePhumoData(raw) {
            const defaultRow = { thu2: '', thu3: '', thu4: '', thu5: '', thu6: '', thu7: '' };
            if (!raw) return { rows: [{ ...defaultRow }], notes: '' };
            if (Array.isArray(raw.rows) && raw.rows.length > 0) {
                const rows = raw.rows.map(r => ({ ...defaultRow, ...r }));
                return { rows: rows, notes: raw.notes || '' };
            }
            return { rows: [{ thu2: raw.thu2 || '', thu3: raw.thu3 || '', thu4: raw.thu4 || '', thu5: raw.thu5 || '', thu6: raw.thu6 || '', thu7: raw.thu7 || '' }], notes: raw.notes || '' };
        }
        let phumoData = normalizePhumoData(StorageUtil.loadJson('phumoData', null));
        let phumoDoctorList = StorageUtil.loadJson(STORAGE_KEYS.phumoDoctorList, []);
        
        // Lịch livetream data
        let livetreamData = StorageUtil.loadJson('livetreamData', []);
        // Danh sách bác sĩ livetream (tick chọn từ danh sách toàn bộ) - mảng tên bác sĩ
        let livetreamDoctorList = StorageUtil.loadJson(STORAGE_KEYS.livetreamDoctorList, []);
        
        // Lịch tầng 4 data
        let tang4Data = StorageUtil.loadJson('tang4Data', []);
        let tang4Notes = localStorage.getItem('tang4Notes') || '';
        
        // Lịch hội chẩn cột1 data
        const defaultHoichancot1ScheduleData = {
            schedule: [
                { session: 'Sáng – T3 chẵn', thu2: 'Lương', thu3: 'Giang', thu4: 'Lương', thu5: 'Nhung', thu6: 'Lương', thu7: '' },
                { session: 'Sáng – T3 lẻ', thu2: 'Hieng', thu3: 'Xuân', thu4: 'Đại', thu5: 'Tùng', thu6: 'Đại', thu7: '' },
                { session: 'Chiều – T3 lẻ', thu2: 'Giang', thu3: 'Công', thu4: 'Nhung', thu5: 'Công', thu6: 'Vinh', thu7: '' },
                { session: 'Chiều – T3 chẵn', thu2: 'Hưng', thu3: 'Vinh', thu4: 'Công', thu5: 'Hưng', thu6: 'Hieng', thu7: '' }
            ],
            notes: [
                'cột1: Hội chẩn tháng lẻ → đi hội chẩn; tháng chẵn → không đi hội chẩn.',
                'Vì các bác sĩ liên tục ra trực và nghỉ phép, nếu người cùng ca nghỉ thì đẩy người còn lại đi hội chẩn.',
                'Bác sĩ đi mổ trong thời gian hội chẩn có thể thu xếp công việc (hội chẩn không cấp thì mổ xong lên đi hội chẩn).'
            ]
        };
        let hoichancot1ScheduleData = StorageUtil.loadJson('hoichancot1ScheduleData', null);
        if (!hoichancot1ScheduleData || !hoichancot1ScheduleData.schedule) {
            hoichancot1ScheduleData = JSON.parse(JSON.stringify(defaultHoichancot1ScheduleData));
        } else {
            // Migration: Thêm thu7 cho các dòng chưa có
            if (hoichancot1ScheduleData.schedule) {
                let changed = false;
                hoichancot1ScheduleData.schedule.forEach(row => {
                    if (row.thu7 === undefined) {
                        row.thu7 = '';
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem('hoichancot1ScheduleData', JSON.stringify(hoichancot1ScheduleData));
                }
            }
        }

        // Xác nhận dữ liệu đã được load
        console.log('✅ Dữ liệu đã được load từ localStorage:', {
            doctors: Object.keys(doctors).reduce((acc, key) => {
                acc[key] = doctors[key].length;
                return acc;
            }, {}),
            accounts: Object.keys(accounts).length,
            submissions: submissions.length,
            cvcot1Data: cvcot1Data.length,
            cvcot23Data: cvcot23Data.length,
            khamhotropkData: khamhotropkData.length,
            khamsomData: Object.keys(khamsomData).length,
            khamcaugiay20hData: Object.keys(khamcaugiay20hData).length,
            khamsanvipData: Object.keys(khamsanvipData).length,
            sieuamvipData: Object.keys(sieuamvipData).length,
            tructruaData: Object.keys(tructruaData).length,
            livetreamData: livetreamData.length,
            tang4Data: tang4Data.length,
            hoichancot1Schedule: hoichancot1ScheduleData.schedule.length
        });

        // ========== Database backend: load từ server / đồng bộ lên server ==========
        // Sau khi áp dụng từ server, ghi luôn vào localStorage để dùng được trên nhiều máy/trình duyệt
        function applyDataFromServer(data) {
            if (!data) return;
            if (data.doctors) {
                doctors.lanhdao = data.doctors.lanhdao || [];
                doctors.cot1 = data.doctors.cot1 || [];
                doctors.cot2 = data.doctors.cot2 || [];
                doctors.cot3 = data.doctors.cot3 || [];
                doctors.partime = data.doctors.partime || [];
                doctors.khac = data.doctors.khac || [];
                StorageUtil.saveJson(STORAGE_KEYS.doctorsLanhdao, doctors.lanhdao);
                StorageUtil.saveJson(STORAGE_KEYS.doctorscot1, doctors.cot1);
                StorageUtil.saveJson(STORAGE_KEYS.doctorscot2, doctors.cot2);
                StorageUtil.saveJson(STORAGE_KEYS.doctorscot3, doctors.cot3);
                StorageUtil.saveJson(STORAGE_KEYS.doctorsPartime, doctors.partime);
                StorageUtil.saveJson(STORAGE_KEYS.doctorsKhac, doctors.khac);
            }
            if (data.accounts != null) {
                const raw = data.accounts;
                // Đảm bảo accounts luôn là object keyed by normalizeKey(username) (tránh lỗi đăng nhập khi server trả về array hoặc format khác)
                if (Array.isArray(raw)) {
                    accounts = {};
                    raw.forEach(function (acc) {
                        const k = normalizeKey(acc.username || acc.name || '');
                        if (k) accounts[k] = { username: acc.username || acc.name || '', password: acc.password || '', role: acc.role || 'doctor', name: acc.name || acc.username || '' };
                    });
                } else if (typeof raw === 'object' && raw !== null) {
                    accounts = raw;
                } else {
                    accounts = {};
                }
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }
            if (data.passwordRequests != null) {
                passwordRequests = data.passwordRequests;
                StorageUtil.saveJson(STORAGE_KEYS.passwordRequests, passwordRequests);
            }
            if (data.leaveSubmissions != null) {
                submissions = data.leaveSubmissions;
                StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
            }
            if (data.permissions != null) {
                permissions = data.permissions;
                StorageUtil.saveJson(STORAGE_KEYS.permissions, permissions);
            }
            if (data.permissionTabs != null) {
                permissionTabs = data.permissionTabs;
                StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
            }
            if (data.quanlynghiphepData != null) {
                quanlynghiphepData = data.quanlynghiphepData;
                StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
            }
            if (data.maxCountByWeekday != null) {
                maxCountByWeekday = data.maxCountByWeekday;
                StorageUtil.saveJson(STORAGE_KEYS.maxCountByWeekday, maxCountByWeekday);
            }
            if (data.fixedScheduleData != null) {
                fixedScheduleData = data.fixedScheduleData;
                StorageUtil.saveJson(STORAGE_KEYS.fixedScheduleData, fixedScheduleData);
            }
            if (data.holidayMarkedDates != null && Array.isArray(data.holidayMarkedDates)) {
                holidayMarkedDates = data.holidayMarkedDates;
                StorageUtil.saveJson(STORAGE_KEYS.holidayMarkedDates, holidayMarkedDates);
            }
            if (data.holidayLabels != null && typeof data.holidayLabels === 'object') {
                holidayLabels = data.holidayLabels;
                StorageUtil.saveJson(STORAGE_KEYS.holidayLabels, holidayLabels);
            }
            if (data.cvcot1Data != null) { cvcot1Data = data.cvcot1Data; StorageUtil.saveJson(STORAGE_KEYS.cvcot1Data, cvcot1Data); }
            if (data.cvcot23Data != null) { cvcot23Data = data.cvcot23Data; StorageUtil.saveJson(STORAGE_KEYS.cvcot23Data, cvcot23Data); }
            if (data.khamhotropkData != null) { khamhotropkData = data.khamhotropkData; StorageUtil.saveJson(STORAGE_KEYS.khamhotropkData, khamhotropkData); }
            if (data.khamsomData != null) { khamsomData = data.khamsomData; StorageUtil.saveJson(STORAGE_KEYS.khamsomData, khamsomData); }
            if (data.khamcaugiayData != null) {
                const localCg = Object.keys(khamcaugiayData || {}).length;
                const serverCg = typeof data.khamcaugiayData === 'object' ? Object.keys(data.khamcaugiayData).length : 0;
                if (serverCg >= localCg) { khamcaugiayData = data.khamcaugiayData; }
                else if (localCg > 0 && typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
            }
            if (data.khamcaugiayDoctorList != null) { khamcaugiayDoctorList = data.khamcaugiayDoctorList; StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayDoctorList, khamcaugiayDoctorList); }
            if (data.khamcaugiayBaoHiem != null) { khamcaugiayBaoHiem = data.khamcaugiayBaoHiem; StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayBaoHiem, khamcaugiayBaoHiem); }
            if (data.khamcaugiayRooms != null) { khamcaugiayRooms = data.khamcaugiayRooms; StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayRooms, khamcaugiayRooms); }
            if (data.khamcaugiay20hData != null) { khamcaugiay20hData = data.khamcaugiay20hData; StorageUtil.saveJson(STORAGE_KEYS.khamcaugiay20hData, khamcaugiay20hData); }
            if (data.khamlongbienData != null) {
                const localLb = Object.keys(khamlongbienData || {}).length;
                const serverLb = typeof data.khamlongbienData === 'object' ? Object.keys(data.khamlongbienData).length : 0;
                if (serverLb >= localLb) { khamlongbienData = data.khamlongbienData; }
                else if (localLb > 0 && typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                StorageUtil.saveJson(STORAGE_KEYS.khamlongbienData, khamlongbienData);
            }
            if (data.khamsanvipData != null) { khamsanvipData = data.khamsanvipData; StorageUtil.saveJson(STORAGE_KEYS.khamsanvipData, khamsanvipData); }
            if (data.sieuamvipData != null) { sieuamvipData = data.sieuamvipData; StorageUtil.saveJson(STORAGE_KEYS.sieuamvipData, sieuamvipData); }
            if (data.tructruaData != null) { tructruaData = data.tructruaData; StorageUtil.saveJson(STORAGE_KEYS.tructruaData, tructruaData); }
            if (data.tieuphauData != null) { tieuphauData = data.tieuphauData; StorageUtil.saveJson(STORAGE_KEYS.tieuphauData, tieuphauData); }
            if (data.livetreamData != null) { livetreamData = data.livetreamData; StorageUtil.saveJson(STORAGE_KEYS.livetreamData, livetreamData); }
            if (data.livetreamDoctorList != null) { livetreamDoctorList = data.livetreamDoctorList; StorageUtil.saveJson(STORAGE_KEYS.livetreamDoctorList, livetreamDoctorList); }
            if (data.tang4Data != null) { tang4Data = data.tang4Data; StorageUtil.saveJson(STORAGE_KEYS.tang4Data, tang4Data); }
            if (data.tang4Notes !== undefined) { tang4Notes = data.tang4Notes || ''; StorageUtil.saveJson(STORAGE_KEYS.tang4Notes, tang4Notes); }
            if (data.hoichancot1ScheduleData != null) { hoichancot1ScheduleData = data.hoichancot1ScheduleData; StorageUtil.saveJson(STORAGE_KEYS.hoichancot1ScheduleData, hoichancot1ScheduleData); }
            if (data.phumoData != null) { phumoData = normalizePhumoData(data.phumoData); StorageUtil.saveJson(STORAGE_KEYS.phumoData, phumoData); }
            if (data.phumoDoctorList != null) { phumoDoctorList = data.phumoDoctorList; StorageUtil.saveJson(STORAGE_KEYS.phumoDoctorList, phumoDoctorList); }
            if (data.tructhuongtruData != null) { tructhuongtruData = data.tructhuongtruData; StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruData, tructhuongtruData); }
            if (data.tructhuongtruDoctorList != null) { tructhuongtruDoctorList = data.tructhuongtruDoctorList; StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruDoctorList, tructhuongtruDoctorList); }
            if (data.lichTrucData != null) { lichTrucData = data.lichTrucData; StorageUtil.saveJson(STORAGE_KEYS.lichTrucData, lichTrucData); }
            if (data.lamviechangngayData != null && typeof data.lamviechangngayData === 'object') {
                // Đếm số ô có bác sĩ (tránh ghi đè khi server trả về cùng ngày nhưng ô trống)
                const countSlots = (obj) => {
                    let n = 0;
                    if (!obj || typeof obj !== 'object') return n;
                    for (const dateKey in obj) {
                        const day = obj[dateKey];
                        if (day && typeof day === 'object') {
                            for (const k in day) if (String(day[k] || '').trim()) n++;
                        }
                    }
                    return n;
                };
                const localSlots = countSlots(lamviechangngayData);
                const serverSlots = countSlots(data.lamviechangngayData);
                if (serverSlots >= localSlots) {
                    lamviechangngayData = data.lamviechangngayData;
                } else if (localSlots > 0 && typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) {
                    syncToBackend();
                }
                StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayData, lamviechangngayData);
            }
            if (data.lamviechangngayDoctorList != null) { lamviechangngayDoctorList = data.lamviechangngayDoctorList; StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayDoctorList, lamviechangngayDoctorList); }
            if (data.lamviechangngayRooms != null) { lamviechangngayRooms = data.lamviechangngayRooms; StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRooms, lamviechangngayRooms); }
            if (data.lamviechangngayRoomsCauGiay != null) { lamviechangngayRoomsCauGiay = data.lamviechangngayRoomsCauGiay; StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsCauGiay, lamviechangngayRoomsCauGiay); }
            if (data.lamviechangngayRoomsLongBien != null) { lamviechangngayRoomsLongBien = data.lamviechangngayRoomsLongBien; StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsLongBien, lamviechangngayRoomsLongBien); }
            if (data.lichlamviecData != null) { lichlamviecData = data.lichlamviecData; StorageUtil.saveJson(STORAGE_KEYS.lichlamviecData, lichlamviecData); }
            if (data.quydinhData != null) { quydinhData = data.quydinhData; StorageUtil.saveJson(STORAGE_KEYS.quydinhData, quydinhData); }
        }

        async function loadFromServerIfEnabled() {
            if (!USE_DATABASE_BACKEND) return false;
            try {
                const url = (typeof STORAGE_API_BASE !== 'undefined' ? STORAGE_API_BASE : '') + '/api/storage/export';
                const r = await fetch(url, { credentials: 'same-origin' });
                if (!r.ok) return false;
                const data = await r.json();
                applyDataFromServer(data);
                console.log('✅ Đã load dữ liệu từ server (database).');
                return true;
            } catch (e) {
                console.warn('Không load được từ server, dùng dữ liệu localStorage.', e);
                return false;
            }
        }

        function getExportData() {
            return {
                version: '1.0',
                exportDate: new Date().toISOString(),
                doctors: { lanhdao: doctors.lanhdao || [], cot1: doctors.cot1 || [], cot2: doctors.cot2 || [], cot3: doctors.cot3 || [], partime: doctors.partime || [], khac: doctors.khac || [] },
                accounts: accounts,
                passwordRequests: passwordRequests,
                leaveSubmissions: submissions,
                cvcot1Data: cvcot1Data,
                cvcot23Data: cvcot23Data,
                khamhotropkData: khamhotropkData,
                khamsomData: khamsomData,
                khamcaugiayData: khamcaugiayData,
                khamcaugiayDoctorList: khamcaugiayDoctorList,
                khamcaugiayBaoHiem: khamcaugiayBaoHiem,
                khamcaugiayRooms: khamcaugiayRooms,
                khamcaugiay20hData: khamcaugiay20hData,
                khamlongbienData: khamlongbienData,
                khamsanvipData: khamsanvipData,
                sieuamvipData: sieuamvipData,
                tructruaData: tructruaData,
                tieuphauData: tieuphauData,
                livetreamData: livetreamData,
                livetreamDoctorList: livetreamDoctorList,
                tang4Data: tang4Data,
                tang4Notes: tang4Notes,
                hoichancot1ScheduleData: hoichancot1ScheduleData,
                phumoData: phumoData,
                phumoDoctorList: phumoDoctorList,
                tructhuongtruData: tructhuongtruData,
                tructhuongtruDoctorList: tructhuongtruDoctorList,
                lichTrucData: lichTrucData,
                lamviechangngayData: lamviechangngayData,
                lamviechangngayDoctorList: lamviechangngayDoctorList,
                lamviechangngayRooms: lamviechangngayRooms,
                lamviechangngayRoomsCauGiay: lamviechangngayRoomsCauGiay,
                lamviechangngayRoomsLongBien: lamviechangngayRoomsLongBien,
                lichlamviecData: lichlamviecData,
                quanlynghiphepData: quanlynghiphepData,
                maxCountByWeekday: maxCountByWeekday,
                fixedScheduleData: fixedScheduleData,
                holidayMarkedDates: holidayMarkedDates,
                holidayLabels: holidayLabels,
                permissions: permissions,
                permissionTabs: permissionTabs,
                quydinhData: quydinhData
            };
        }

        async function syncToBackend() {
            if (!USE_DATABASE_BACKEND) {
                if (typeof alert !== 'undefined') alert('Tính năng đồng bộ server đang tắt (USE_DATABASE_BACKEND = false).');
                return;
            }
            try {
                const url = (STORAGE_API_BASE || '') + '/api/storage/export';
                const r = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(getExportData())
                });
                if (r.ok) {
                    console.log('✅ Đã đồng bộ dữ liệu lên server.');
                } else {
                    if (typeof alert !== 'undefined') alert('❌ Đồng bộ thất bại: ' + r.status);
                }
            } catch (e) {
                console.error('Lỗi đồng bộ lên server:', e);
                if (typeof alert !== 'undefined') alert('❌ Lỗi đồng bộ: ' + e.message);
            }
        }

        // Expose for UI (nút Đồng bộ lên server)
        window.syncToBackend = syncToBackend;

        // =========================================================
        // MODULE 1: Tài khoản + Phân quyền (accounts/permissions)
        // - normalize key
        // - init admin / login / đổi mật khẩu / quyền chỉnh sửa
        // =========================================================
        // Normalize username: không phân biệt hoa/thường, bỏ dấu, bỏ khoảng trắng (đầu/cuối/giữa)
        // "Nguyễn Văn A", "nguyen van a", "nguyenvana", "  Nguyen Van A  " → cùng key "nguyenvana"
        function normalizeKey(name) {
            let s = (name || '').toString().trim().toLowerCase();
            s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Bỏ dấu tiếng Việt
            return s.replace(/\s+/g, ''); // Bỏ tất cả khoảng trắng
        }

        // Migrate existing accounts to normalized keys (run once on load)
        (function normalizeAccountsStore() {
            const orig = Object.values(accounts || {});
            const rebuilt = {};
            let changed = false;
            orig.forEach(acc => {
                const key = normalizeKey(acc.username || acc.name || '');
                if (!key) return;
                // if key collides, later one wins (best-effort)
                rebuilt[key] = {
                    username: acc.username,
                    password: acc.password,
                    role: acc.role,
                    name: acc.name
                };
            });
            // detect difference by key count
            const origKeys = Object.keys(accounts || {});
            const newKeys = Object.keys(rebuilt);
            if (origKeys.length !== newKeys.length || newKeys.some(k => !accounts[k])) {
                accounts = rebuilt;
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }
        })();

        // Ensure every doctor in stored lists has an account (create with default password '1234')
        // - Không phân biệt hoa/thường, dấu, khoảng trắng khi so khớp (dùng normalizeKey)
        // - Nếu có nhiều bác sĩ trùng Họ tên, tự sinh thêm số 2,3,4... vào tên đăng nhập để phân biệt
        function ensureDoctorAccounts() {
            const groups = ['lanhdao','cot1','cot2','cot3','partime','khac'];
            let changed = false;

            // Đếm số bác sĩ cho từng key chuẩn hóa theo Họ tên (để biết có trùng hay không)
            const nameCounts = {};
            groups.forEach(g => {
                const list = doctors[g] || [];
                list.forEach(doc => {
                    const nameKey = normalizeKey(doc.name);
                    if (!nameKey) return;
                    nameCounts[nameKey] = (nameCounts[nameKey] || 0) + 1;
                });
            });

            // Theo từng bác sĩ, tạo username duy nhất (thêm số nếu cần)
            const usedIndex = {};
            groups.forEach(g => {
                const list = doctors[g] || [];
                list.forEach(doc => {
                    const baseKey = normalizeKey(doc.name);
                    if (!baseKey) return;

                    const totalForName = nameCounts[baseKey] || 1;
                    usedIndex[baseKey] = (usedIndex[baseKey] || 0) + 1;
                    const index = usedIndex[baseKey];

                    // Bác sĩ đầu tiên: giữ nguyên Họ tên làm tên đăng nhập
                    // Bác sĩ thứ 2 trở đi (trùng Họ tên): thêm số 2,3,4... phía sau
                    const usernameCandidate = (totalForName === 1 || index === 1)
                        ? doc.name
                        : (doc.name + ' ' + index);

                    const accountKey = normalizeKey(usernameCandidate);
                    if (!accountKey) return;

                    // Nếu tài khoản với key này đã tồn tại thì bỏ qua (đã tạo trước đó)
                    if (accounts[accountKey]) {
                        return;
                    }

                    accounts[accountKey] = {
                        username: usernameCandidate,
                        password: '1234',
                        role: 'doctor',
                        name: doc.name
                    };
                    changed = true;
                });
            });

            if (changed) {
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }
        }

        // Quy định chung data
        let quydinhData = StorageUtil.loadJson(STORAGE_KEYS.quydinhData, {
            tabs: [
                { id: 'tab1', name: 'Đỡ đẻ YC', content: '' },
                { id: 'tab2', name: 'Truyền máu', content: '' },
                { id: 'tab3', name: 'BA phá thai', content: '' }
            ],
            activeTabId: 'tab1'
        });

        // Khởi tạo tài khoản admin mặc định
        function initAdminAccount() {
            try {
                const key = normalizeKey('admin');
                if (!accounts[key]) {
                    accounts[key] = {
                        username: 'admin',
                        password: 'admin123',
                        role: 'admin',
                        name: 'Quản Trị Viên'
                    };
                    try {
                        StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
                    } catch (storageError) {
                        console.error('Lỗi khi lưu tài khoản admin:', storageError);
                    }
                }
            } catch (error) {
                console.error('Lỗi khi khởi tạo tài khoản admin:', error);
            }
        }

        // Kiểm tra đăng nhập khi trang tải
        function checkLoginStatus() {
            initAdminAccount();
            if (currentUser) {
                showMainContent();
            } else {
                showLoginModal();
            }
        }

        // Hiển thị modal đăng nhập (trang con không có modal thì chuyển về trang chủ để đăng nhập)
        function showLoginModal() {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.classList.add('active');
            } else if (window.location.pathname.indexOf('/pages/') !== -1) {
                window.location.replace('/');
            }
        }

        // Đóng modal đăng nhập (khi không muốn đăng nhập hoặc muốn thoát) — quay về trang có nút đăng nhập
        function closeLoginModal() {
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('active');
            // Nếu đang ở trang con (pages/*) thì chuyển về trang chủ — trang có form đăng nhập
            if (window.location.pathname.indexOf('pages') !== -1) {
                window.location.href = '../QuanlynhanlucBS.html';
            }
        }
        window.closeLoginModal = closeLoginModal;

        // ----- Admin đặt lại mật khẩu qua email -----
        var ADMIN_RESET_EMAIL_DEFAULT = 'hangocdai.pkq3@gmail.com';

        function ensureAdminResetModalInDom() {
            if (document.getElementById('adminResetModal')) return;
            var html = '<div id="adminResetModal" class="login-modal">' +
                '<div class="login-box" style="max-width:420px;">' +
                '<h2>🔐 Đặt lại mật khẩu Admin</h2>' +
                '<p style="font-size:14px;color:#666;margin-bottom:15px;">Nhập email admin đã đăng ký. Mật khẩu tạm sẽ được gửi qua email (hoặc hiển thị sau khi gửi).</p>' +
                '<p style="font-size:13px;color:#856404;background:#fff3cd;padding:8px 10px;border-radius:6px;margin-bottom:15px;">⚠️ Sau khi đặt lại, <strong>mật khẩu cũ không thể dùng lại</strong> — chỉ mật khẩu tạm mới hợp lệ. Chỉ thực hiện nếu bạn là admin.</p>' +
                '<div id="adminResetErrorMessage" class="error-message" style="display:none;"></div>' +
                '<div id="adminResetSuccessMessage" class="success-message" style="display:none;"></div>' +
                '<form id="adminResetForm" onsubmit="handleAdminResetSubmit(event)">' +
                '<div class="form-group"><label for="adminResetEmail">Email admin <span class="required">*</span></label>' +
                '<input type="email" id="adminResetEmail" required placeholder="hang....@gmail.com" autocomplete="email"></div>' +
                '<div style="display:flex;gap:10px;">' +
                '<button type="button" class="submit-btn" onclick="closeAdminResetModal()" style="background:#95a5a6;flex:1;">Hủy</button>' +
                '<button type="submit" id="adminResetSubmitBtn" class="submit-btn" style="flex:1;">Gửi đặt lại mật khẩu</button></div></form></div></div>';
            var wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            document.body.appendChild(wrap.firstChild);
        }

        function openAdminResetModal() {
            ensureAdminResetModalInDom();
            var modal = document.getElementById('adminResetModal');
            var emailInput = document.getElementById('adminResetEmail');
            var errEl = document.getElementById('adminResetErrorMessage');
            var okEl = document.getElementById('adminResetSuccessMessage');
            if (!modal) return;
            if (emailInput) { emailInput.value = ''; emailInput.placeholder = 'hang....@gmail.com'; }
            if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
            if (okEl) { okEl.style.display = 'none'; okEl.textContent = ''; }
            var submitBtn = document.getElementById('adminResetSubmitBtn');
            if (submitBtn) {
                submitBtn.type = 'submit';
                submitBtn.textContent = 'Gửi đặt lại mật khẩu';
                submitBtn.onclick = null;
            }
            modal.classList.add('active');
        }
        window.openAdminResetModal = openAdminResetModal;

        function closeAdminResetModal() {
            var modal = document.getElementById('adminResetModal');
            if (modal) modal.classList.remove('active');
        }
        window.closeAdminResetModal = closeAdminResetModal;

        function handleAdminResetSubmit(event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            var emailInput = document.getElementById('adminResetEmail');
            var errEl = document.getElementById('adminResetErrorMessage');
            var okEl = document.getElementById('adminResetSuccessMessage');
            if (!emailInput || !errEl || !okEl) return;
            errEl.style.display = 'none';
            okEl.style.display = 'none';
            var email = emailInput.value.trim();
            if (!email) {
                errEl.textContent = 'Vui lòng nhập email.';
                errEl.style.display = 'block';
                return;
            }
            // Xác nhận trước khi gửi: tránh người khác click nhầm
            var confirmMsg = 'Bạn có chắc muốn đặt lại mật khẩu Admin?\n\n'
                + '• Mật khẩu hiện tại sẽ KHÔNG dùng được nữa.\n'
                + '• Email "' + email + '" sẽ nhận mật khẩu tạm.\n'
                + '• Chỉ thực hiện nếu bạn là admin hoặc được ủy quyền.\n\n'
                + 'Tiếp tục?';
            if (!confirm(confirmMsg)) return;
            var base = (typeof STORAGE_API_BASE !== 'undefined' ? STORAGE_API_BASE : '') || '';
            var url = base + '/api/auth/request-admin-reset';
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (res.ok) {
                        var doAfterLoad = function () {
                            okEl.innerHTML = (data.message || 'Đã gửi.') + (data.tempPassword ? '<br><br><strong>Mật khẩu tạm:</strong> <code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;">' + data.tempPassword + '</code><br><small>Vui lòng đăng nhập bằng mật khẩu tạm và đổi mật khẩu ngay.</small>' : '');
                            okEl.style.display = 'block';
                            var submitBtn = document.getElementById('adminResetSubmitBtn');
                            if (submitBtn) {
                                submitBtn.type = 'button';
                                submitBtn.textContent = 'Đăng nhập';
                                submitBtn.onclick = function () {
                                    closeAdminResetModal();
                                    if (typeof showLoginModal === 'function') showLoginModal();
                                };
                            }
                        };
                        if (typeof loadFromServerIfEnabled === 'function') {
                            loadFromServerIfEnabled().then(doAfterLoad).catch(function () { doAfterLoad(); });
                        } else {
                            doAfterLoad();
                        }
                    } else {
                        errEl.textContent = data.detail || data.message || 'Có lỗi xảy ra.';
                        errEl.style.display = 'block';
                    }
                });
            }).catch(function (e) {
                errEl.textContent = 'Không kết nối được server. Kiểm tra backend đang chạy và thử lại.';
                errEl.style.display = 'block';
            });
        }
        window.handleAdminResetSubmit = handleAdminResetSubmit;

        // Toggle password visibility for inputs - hàm đơn giản và đáng tin cậy
        function togglePassword(inputId, btnElement) {
            try {
                // Lấy input element
                const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
                const btn = btnElement || (typeof inputId === 'object' ? inputId : null);
                
                if (!input) {
                    console.error('Không tìm thấy input với ID:', inputId);
                    return false;
                }
                
                if (!btn) {
                    console.error('Không tìm thấy button element');
                    return false;
                }
                
                // Toggle password visibility
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = '🙈';
                    btn.setAttribute('aria-label', 'Ẩn mật khẩu');
                    btn.title = 'Ẩn mật khẩu';
                } else {
                    input.type = 'password';
                    btn.textContent = '👁️';
                    btn.setAttribute('aria-label', 'Hiện mật khẩu');
                    btn.title = 'Hiện mật khẩu';
                }
                
                return false; // Ngăn form submit nếu có
            } catch (error) {
                console.error('Lỗi khi toggle password:', error);
                return false;
            }
        }
        
        // Đảm bảo hàm togglePassword có thể truy cập từ global scope
        window.togglePassword = togglePassword;

        // Fullscreen toggle
        function toggleFullScreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Không thể bật toàn màn hình: ${err.message}`);
                });
                document.getElementById('fullscreenBtn').textContent = '⛶ Thoát toàn màn hình';
            } else {
                document.exitFullscreen();
                document.getElementById('fullscreenBtn').textContent = '⛶ Toàn màn hình';
            }
        }

        // Khởi tạo tất cả các tab để nội dung luôn sẵn sàng (dùng cho chế độ cũ / fallback)
        function initAllTabs() {
            // Khởi tạo các tab danh sách bác sĩ: cả admin và bác sĩ đều được xem danh sách (bác sĩ chỉ xem, không chỉnh sửa)
            if (currentUser) {
                ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'].forEach(tabName => {
                    displayDoctors(tabName);
                });
            }
            
            // Khởi tạo các bảng quản lý
            if (typeof initcvcot1Table === 'function') {
                initcvcot1Table();
            }
            if (typeof initcvcot23Table === 'function') {
                initcvcot23Table();
            }
            if (typeof initKhamHoTroPKTable === 'function') {
                initKhamHoTroPKTable();
            }
            if (typeof initKhamSomCalendar === 'function') {
                initKhamSomCalendar();
            }
            if (typeof initTructruaCalendar === 'function') {
                initTructruaCalendar();
            }
            if (typeof inittieuphauCalendar === 'function') {
                inittieuphauCalendar();
            }
            if (typeof initLivetreamTable === 'function') {
                initLivetreamTable();
            }
            if (typeof initTang4Table === 'function') {
                initTang4Table();
            }
            if (typeof initHoichancot1Schedule === 'function') {
                initHoichancot1Schedule();
            }
            if (typeof initPhumoTable === 'function') {
                initPhumoTable();
            }
            if (typeof initTructhuongtruTable === 'function') {
                initTructhuongtruTable();
            }
            if (typeof initLamviechangngayTable === 'function') {
                initLamviechangngayTable();
            }
            
            // Khởi tạo calendar nếu cần
            // Render calendar cho cả admin và bác sĩ
            if (typeof renderAdminCalendars === 'function' && currentUser) {
                renderAdminCalendars();
            }
            
            // Render calendar cho tab Đăng ký nghỉ phép nếu user đã đăng nhập
            if (currentUser && typeof renderNghiPhepCalendars === 'function') {
                renderNghiPhepCalendars();
            }
            
            // Cập nhật mô tả tab theo role
            const descElement = document.getElementById('quanlynghiphepDescription');
            if (descElement && currentUser) {
                if (currentUser.role === 'admin') {
                    descElement.textContent = 'Duyệt yêu cầu nghỉ phép và quản lý lịch nghỉ phép. Click vào ngày để xem và duyệt.';
                } else {
                    descElement.textContent = 'Tài khoản cá nhân mặc định có quyền đăng ký nghỉ phép cho bản thân. Click vào ngày để đăng ký hoặc xem chi tiết.';
                }
            }
        }

        // Lấy tên tab ban đầu: ưu tiên data-current-tab (trang con pages/*), sau đó URL hash
        function getInitialTabName() {
            try {
                var fromBody = document.body && document.body.getAttribute('data-current-tab');
                if (fromBody && fromBody.trim()) return fromBody.trim();
                var raw = (window.location.hash || '').replace(/^#/, '').trim();
                if (!raw) return 'cot1';
                return decodeURIComponent(raw);
            } catch {
                return 'cot1';
            }
        }

        // Khởi tạo nhẹ chỉ cho tab đang dùng (mỗi "trang" chỉ load phần cần thiết)
        function initTabsForCurrentPage() {
            const tabName = getInitialTabName();

            // Nếu đã đăng nhập và đang ở tab danh sách bác sĩ: cả admin và bác sĩ đều được xem danh sách
            if (currentUser && ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'].includes(tabName)) {
                displayDoctors(tabName);
            }

            // Khởi tạo theo từng tab chuyên biệt
            switch (tabName) {
                case 'cvcot1':
                    if (typeof initcvcot1Table === 'function') initcvcot1Table();
                    break;
                case 'cvcot23':
                    if (typeof initcvcot23Table === 'function') initcvcot23Table();
                    break;
                case 'khamhotropk':
                    if (typeof initKhamHoTroPKTable === 'function') initKhamHoTroPKTable();
                    break;
                case 'khamsom':
                    if (typeof initKhamSomCalendar === 'function') initKhamSomCalendar();
                    break;
                case 'khamcaugiay':
                    if (typeof initKhamCauGiayCalendar === 'function') initKhamCauGiayCalendar();
                    break;
                case 'khamsomTruaLB':
                    if (typeof initKhamSomTruaLBCalendar === 'function') initKhamSomTruaLBCalendar();
                    break;
                case 'khamcaugiay20h':
                    if (typeof initKhamCauGiay20hCalendar === 'function') initKhamCauGiay20hCalendar();
                    break;
                case 'khamlongbien':
                    if (typeof initKhamLongBienCalendar === 'function') initKhamLongBienCalendar();
                    break;
                case 'khamsanSieuamVip':
                    if (typeof initKhamSanSieuamVipCalendar === 'function') initKhamSanSieuamVipCalendar();
                    break;
                case 'tructrua':
                    if (typeof initTructruaCalendar === 'function') initTructruaCalendar();
                    break;
                case 'tieuphau':
                    if (typeof inittieuphauCalendar === 'function') inittieuphauCalendar();
                    break;
                case 'livetream':
                    if (typeof initLivetreamTable === 'function') initLivetreamTable();
                    break;
                case 'tang4':
                    if (typeof initTang4Table === 'function') initTang4Table();
                    break;
                case 'hoichancot1':
                    if (typeof initHoichancot1Schedule === 'function') initHoichancot1Schedule();
                    break;
                case 'phumo':
                    if (typeof initPhumoTable === 'function') initPhumoTable();
                    break;
                case 'tructhuongtru':
                    if (typeof initTructhuongtruTable === 'function') initTructhuongtruTable();
                    break;
                case 'lamviechangngay':
                    if (typeof initLamviechangngayTable === 'function') initLamviechangngayTable();
                    break;
                case 'lichlamviec':
                    if (typeof initLichlamviecTable === 'function') initLichlamviecTable();
                    break;
                case 'quanlynghiphep':
                case 'nghiphep':
                    // Calendar quản lý / đăng ký nghỉ phép
                    if (typeof renderAdminCalendars === 'function' && currentUser) {
                        renderAdminCalendars();
                    }
                    if (currentUser && typeof renderNghiPhepCalendars === 'function') {
                        renderNghiPhepCalendars();
                    }
                    // Cập nhật mô tả theo role
                    const descElement = document.getElementById('quanlynghiphepDescription');
                    if (descElement && currentUser) {
                        if (currentUser.role === 'admin') {
                            descElement.textContent = 'Duyệt yêu cầu nghỉ phép và quản lý lịch nghỉ phép. Click vào ngày để xem và duyệt.';
                        } else {
                            descElement.textContent = 'Xem lịch nghỉ phép và đăng ký nghỉ phép. Click vào ngày để xem chi tiết hoặc đăng ký.';
                        }
                    }
                    break;
                case 'lichnghiphep':
                    // Tab Lịch nghỉ phép cá nhân
                    if (typeof initLichNghiPhepTab === 'function') {
                        initLichNghiPhepTab();
                    }
                    break;
                case 'ngaycong':
                    // Tab Ngày công làm việc
                    if (typeof initNgayCongTab === 'function') {
                        initNgayCongTab();
                    }
                    break;
                case 'lichtruc':
                    // Tab Lịch trực
                    if (typeof renderLichTrucCalendars === 'function' && currentUser) {
                        renderLichTrucCalendars();
                    }
                    break;
                case 'quanlytaikhoan':
                    // Trang con quanlytaikhoan.html: hiển thị danh sách tài khoản và yêu cầu reset mật khẩu (dữ liệu đã load trong init)
                    if (typeof displayAccounts === 'function') displayAccounts();
                    if (typeof displayPasswordRequests === 'function') displayPasswordRequests();
                    break;
                default:
                    // Các tab khác chủ yếu dùng chung dữ liệu đã load (accounts, doctors, submissions...)
                    break;
            }
            // Tài khoản cá nhân: hiển thị thông báo quyền (Được thay đổi / Chỉ đọc) ở đầu tab
            if (currentUser && currentUser.role === 'doctor' && typeof updatePermissionNoticeForTab === 'function') {
                updatePermissionNoticeForTab(tabName);
            }
        }

        // Deep-link: mở tab theo URL hash, ví dụ `QuanlynhanlucBS.html#nghiphep`
        function activateTabFromHash() {
            try {
                const raw = (window.location.hash || '').replace(/^#/, '').trim();
                if (!raw) return;
                const tabName = decodeURIComponent(raw);

                // Tìm tab element tương ứng (đã chuẩn hoá bằng data-tab)
                const btn = document.querySelector(`.tabs .tab[data-tab="${CSS.escape(tabName)}"]`);

                if (typeof switchTab === 'function') {
                    switchTab(tabName, btn || null);
                    // Nếu mở tab Quản lý tài khoản (từ thông báo "Xem & xử lý"), cuộn tới mục yêu cầu reset mật khẩu
                    if (tabName === 'quanlytaikhoan') {
                        setTimeout(function () {
                            var el = document.getElementById('passwordRequestList');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 500);
                    }
                } else if (typeof checkLoginForTab === 'function' && tabName === 'nghiphep') {
                    // fallback
                    checkLoginForTab(tabName, btn || null);
                }
            } catch (e) {
                console.warn('Không thể mở tab từ hash:', e);
            }
        }

        // Hiển thị nội dung chính
        function showMainContent() {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.classList.remove('active');
            }
            updateUIForUser();
            // Nếu là admin, đảm bảo các bác sĩ có tài khoản (mật khẩu mặc định 1234)
            if (currentUser && currentUser.role === 'admin') {
                ensureDoctorAccounts();
                displayAccounts();
                displayPasswordRequests();
            }
            // Khởi tạo lại date inputs và form
            setTimeout(() => {
                initDateInputs();
                initLeaveForm();
            }, 100);
            // Hiển thị danh sách
            displaySubmissions();
            if (currentUser && currentUser.role === 'admin') {
                displayDoctors('cot1');
            }
            
            // Khởi tạo nội dung cho tab hiện tại (mỗi trang chỉ load phần cần thiết)
            setTimeout(() => {
                try {
                    initTabsForCurrentPage();
                } catch (error) {
                    console.error('Lỗi khi khởi tạo tab hiện tại:', error);
                    // Fallback: nếu có lỗi, thử khởi tạo toàn bộ như hành vi cũ
                    try {
                        initAllTabs();
                    } catch (e2) {
                        console.error('Lỗi khi fallback initAllTabs:', e2);
                    }
                }
            }, 200);
        }

        // Cập nhật UI theo người dùng
        function updateUIForUser() {
            if (currentUser) {
                const userNameDisplay = document.getElementById('userNameDisplay');
                const userInfo = document.getElementById('userInfo');
                if (userNameDisplay) {
                    userNameDisplay.textContent = `Xin chào: ${currentUser.name}`;
                }
                if (userInfo) {
                    userInfo.style.display = 'flex';
                }
                
                if (currentUser.role === 'admin') {
                    // Hiển thị tất cả tab cho admin
                    document.querySelectorAll('.admin-only').forEach(el => {
                        el.classList.add('show');
                        if (el.classList.contains('tab')) {
                            el.style.display = 'block';
                        }
                    });
                    // Hiển thị phần Debug cho admin
                    document.querySelectorAll('.admin-debug-only').forEach(el => {
                        el.style.display = 'block';
                    });
                    // Hiển thị phần Sao Lưu & Khôi Phục Dữ Liệu cho admin
                    document.querySelectorAll('.admin-backup-only').forEach(el => {
                        el.style.display = 'block';
                    });
                    // Hiển thị tab content cho admin
                    const quanlytaikhoanContent = document.getElementById('quanlytaikhoan');
                    const quanlynghiphepContent = document.getElementById('quanlynghiphep');
                    if (quanlytaikhoanContent) quanlytaikhoanContent.style.display = 'block';
                    if (quanlynghiphepContent) quanlynghiphepContent.style.display = 'block';
                    const nghiphepTab = document.getElementById('nghiphepTab');
                    if (nghiphepTab) {
                        nghiphepTab.style.display = 'none';
                    }
                    // Đảm bảo tab đầu tiên được active nếu chưa có tab nào active
                    if (!document.querySelector('.tab.active')) {
                        const firstTab = document.querySelector('.admin-only.tab');
                        if (firstTab) {
                            firstTab.classList.add('active');
                            const onclickAttr = firstTab.getAttribute('onclick');
                            if (onclickAttr) {
                                const match = onclickAttr.match(/'([^']+)'/);
                                if (match) {
                                    switchTab(match[1], firstTab);
                                }
                            }
                        }
                    }
                } else {
                    // Bác sĩ có thể xem một số tab nhưng không được chỉnh sửa
                    // Ẩn các tab admin quan trọng
                    const quanlytaikhoanTab = document.querySelector('button[onclick*="quanlytaikhoan"]');
                    const quanlynghiphepTab = document.querySelector('button[onclick*="quanlynghiphep"]');
                    if (quanlytaikhoanTab) quanlytaikhoanTab.style.display = 'none';
                    if (quanlynghiphepTab) quanlynghiphepTab.style.display = 'none';
                    
                    // Ẩn tab content của Quản Lý Tài Khoản và Quản Lý Nghỉ Phép
                    const quanlytaikhoanContent = document.getElementById('quanlytaikhoan');
                    const quanlynghiphepContent = document.getElementById('quanlynghiphep');
                    if (quanlytaikhoanContent) quanlytaikhoanContent.style.display = 'none';
                    if (quanlynghiphepContent) quanlynghiphepContent.style.display = 'none';
                    
                    // Hiển thị các tab khác
                    document.querySelectorAll('.admin-only').forEach(el => {
                        if (el.classList.contains('tab')) {
                            const onclickAttr = el.getAttribute('onclick');
                            if (onclickAttr && (onclickAttr.includes('quanlytaikhoan') || onclickAttr.includes('quanlynghiphep'))) {
                                el.style.display = 'none';
                            } else {
                                el.classList.add('show');
                                el.style.display = 'block';
                            }
                        } else {
                            el.classList.add('show');
                        }
                    });
                    
                    const nghiphepTab = document.getElementById('nghiphepTab');
                    if (nghiphepTab) {
                        nghiphepTab.style.display = 'block';
                        nghiphepTab.classList.add('show');
                    }
                    // Disable tất cả các nút chỉnh sửa cho bác sĩ
                    disableEditForDoctor();
                }
                // update notification count
                updateNotifCount();
                // Cập nhật badge trên nút danh sách duyệt nghỉ phép
                updateLeaveRequestListBadge();
            }
        }

        // Disable tất cả các nút chỉnh sửa cho bác sĩ (chỉ xem, không chỉnh sửa)
        function disableEditForDoctor() {
            // Ẩn các form thêm bác sĩ ở các tab không có quyền
            ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'].forEach(tabType => {
                if (!hasPermission(tabType)) {
                    const form = document.querySelector(`#${tabType} .add-doctor-form`);
                    if (form) form.style.display = 'none';
                }
            });

            // Disable các nút xóa và sửa trong danh sách bác sĩ ở các tab không có quyền
            ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'].forEach(tabType => {
                if (!hasPermission(tabType)) {
                    const container = document.getElementById(`doctorList${getDoctorFormIdSuffix(tabType)}`);
                    if (container) {
                        container.querySelectorAll('.delete-btn, .edit-btn').forEach(btn => {
                            btn.style.display = 'none';
                        });
                    }
                }
            });

            // Disable các nút trong tab Quản Lý Tài Khoản (ẩn thay vì làm mờ)
            const accountList = document.getElementById('accountList');
            if (accountList) {
                accountList.querySelectorAll('button').forEach(btn => {
                    btn.style.display = 'none';
                });
            }

            // Disable các nút trong tab Quản Lý Nghỉ Phép (ẩn thay vì làm mờ)
            const adminReviewList = document.getElementById('adminReviewList');
            if (adminReviewList) {
                adminReviewList.querySelectorAll('button').forEach(btn => {
                    btn.style.display = 'none';
                });
            }

            // Disable các nút export/import trong tab Quản Lý Tài Khoản (ẩn thay vì làm mờ)
            document.querySelectorAll('button[onclick*="exportAllData"], button[onclick*="clearAllData"], input[onchange*="importAllData"]').forEach(btn => {
                btn.style.display = 'none';
            });

            // Ẩn phần Debug: LocalStorage để tránh lộ mật khẩu
            document.querySelectorAll('.admin-debug-only').forEach(el => {
                el.style.display = 'none';
            });

            // Ẩn phần Sao Lưu & Khôi Phục Dữ Liệu
            document.querySelectorAll('.admin-backup-only').forEach(el => {
                el.style.display = 'none';
            });

            // Disable các nút trong cv cột1 nếu không có quyền
            if (!hasPermission('cvcot1')) {
                const cvcot1Table = document.getElementById('cvcot1Table');
                if (cvcot1Table) {
                    // Ẩn nút thêm dòng
                    const addBtn = cvcot1Table.closest('.form-container')?.querySelector('button[onclick*="addcvcot1Row"]');
                    if (addBtn) addBtn.style.display = 'none';
                    
                    // Disable tất cả input và select nhưng hiển thị rõ ràng (giống admin)
                    cvcot1Table.querySelectorAll('button, select, input').forEach(el => {
                        if (el.tagName === 'BUTTON') {
                            el.style.display = 'none';
                        } else {
                            el.disabled = true;
                            // Giữ màu nền trắng và text đậm để hiển thị rõ ràng
                            el.style.backgroundColor = '#ffffff';
                            el.style.color = '#333333';
                            el.style.borderColor = '#ddd';
                        }
                    });
                }
            }

            // Disable các nút trong Khám hỗ trợ PK nếu không có quyền
            if (!hasPermission('khamhotropk')) {
                const khamhotropkTable = document.getElementById('khamhotropkTable');
                if (khamhotropkTable) {
                    // Ẩn nút thêm dòng
                    const addBtn = khamhotropkTable.closest('.form-container')?.querySelector('button[onclick*="addKhamHoTroPKRow"]');
                    if (addBtn) addBtn.style.display = 'none';
                    
                    // Disable tất cả input và button nhưng hiển thị rõ ràng (giống admin)
                    khamhotropkTable.querySelectorAll('button, input').forEach(el => {
                        if (el.tagName === 'BUTTON') {
                            el.style.display = 'none';
                        } else {
                            el.disabled = true;
                            // Giữ màu nền trắng và text đậm để hiển thị rõ ràng
                            el.style.backgroundColor = '#ffffff';
                            el.style.color = '#333333';
                            el.style.borderColor = '#ddd';
                            el.style.cursor = 'not-allowed';
                            el.style.opacity = '1'; // Đảm bảo không bị mờ
                        }
                    });
                }
            }

            // Disable các nút trong cv cột2+3nếu không có quyền
            if (!hasPermission('cvcot23')) {
                const cvcot23Table = document.getElementById('cvcot23Table');
                if (cvcot23Table) {
                    // Ẩn nút thêm dòng
                    const addBtn = cvcot23Table.closest('.form-container')?.querySelector('button[onclick*="addcvcot23Row"]');
                    if (addBtn) addBtn.style.display = 'none';
                    
                    // Disable tất cả input và select nhưng hiển thị rõ ràng (giống admin)
                    cvcot23Table.querySelectorAll('button, select, input').forEach(el => {
                        if (el.tagName === 'BUTTON') {
                            el.style.display = 'none';
                        } else {
                            el.disabled = true;
                            // Giữ màu nền trắng và text đậm để hiển thị rõ ràng
                            el.style.backgroundColor = '#ffffff';
                            el.style.color = '#333333';
                            el.style.borderColor = '#ddd';
                            el.style.cursor = 'not-allowed';
                            el.style.opacity = '1'; // Đảm bảo không bị mờ
                        }
                    });
                }
            }
            
            // Disable các nút thêm dòng ở các tab khác nếu không có quyền
            const tabButtons = [
                { tab: 'livetream', func: 'addLivetreamRow' },
                { tab: 'tang4', func: 'addTang4Row' }
            ];
            
            tabButtons.forEach(({ tab, func }) => {
                if (!hasPermission(tab)) {
                    const addBtn = document.querySelector(`#${tab} button[onclick*="${func}"]`);
                    if (addBtn) addBtn.style.display = 'none';
                }
            });

            // Thông báo quyền theo tab (chỉ tài khoản cá nhân): cập nhật cho tab đang active
            var activeTabContent = document.querySelector('.tab-content.active');
            if (activeTabContent && activeTabContent.id) {
                updatePermissionNoticeForTab(activeTabContent.id);
            }
        }

        // Cập nhật thông báo quyền ở đầu nội dung tab (chỉ tài khoản cá nhân / bác sĩ)
        // Có quyền chỉnh sửa tab: chữ "Được thay đổi thông tin" màu xanh; chỉ đọc: chữ "Chỉ đọc" màu vàng
        function updatePermissionNoticeForTab(tabName) {
            var tabContent = document.getElementById(tabName);
            if (!tabContent) return;
            // Xóa thông báo cũ (cả class cũ và mới)
            tabContent.querySelectorAll('.read-only-notice, .permission-notice').forEach(function (el) { el.remove(); });
            if (!currentUser || currentUser.role !== 'doctor') return;

            // Tab nghiphep: tài khoản cá nhân mặc định có quyền đăng ký nghỉ phép cho bản thân → hiển thị "Được thay đổi thông tin"
            var canEdit = hasPermission(tabName) || (tabName === 'nghiphep' && typeof canRegisterOwnLeave === 'function' && canRegisterOwnLeave());
            var notice = document.createElement('div');
            notice.className = 'permission-notice';
            notice.setAttribute('role', 'status');
            if (canEdit) {
                notice.style.cssText = 'padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745; background: #f0f9f0;';
                notice.innerHTML = '<strong style="color: #1e7e34;">✓ Được thay đổi thông tin</strong>';
            } else {
                notice.style.cssText = 'padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107; background: #fffbf0;';
                notice.innerHTML = '<strong style="color: #b8860b;">⚠ Chỉ đọc</strong>';
            }
            var formContainer = tabContent.querySelector('.form-container');
            if (formContainer) {
                formContainer.insertBefore(notice, formContainer.firstChild);
            } else {
                if (tabContent.firstChild) {
                    tabContent.insertBefore(notice, tabContent.firstChild);
                } else {
                    tabContent.appendChild(notice);
                }
            }
        }

        // Xử lý đăng nhập
        function handleLogin(event) {
            event.preventDefault();
            
            // Đảm bảo admin account được khởi tạo và dùng đúng dữ liệu accounts (từ localStorage nếu đã load từ server trước đó)
            initAdminAccount();
            const accountsToUse = StorageUtil.loadJson(STORAGE_KEYS.accounts, {});
            
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const errorMsg = document.getElementById('loginErrorMessage');
            
            // Hàm hiển thị lỗi
            function showError(message, highlightInput = null) {
                try {
                if (errorMsg) {
                    errorMsg.textContent = message;
                    errorMsg.style.display = 'block';
                    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else if (typeof alert !== 'undefined') {
                        alert(message);
                    }
                } catch (e) {
                    console.error('showError:', e);
                    if (typeof alert !== 'undefined') alert(message);
                }
                
                // Xóa highlight cũ
                if (usernameInput) usernameInput.classList.remove('input-error');
                if (passwordInput) passwordInput.classList.remove('input-error');
                
                // Highlight input bị lỗi
                if (highlightInput === 'username' && usernameInput) {
                    usernameInput.classList.add('input-error');
                    usernameInput.focus();
                } else if (highlightInput === 'password' && passwordInput) {
                    passwordInput.classList.add('input-error');
                    passwordInput.focus();
                } else if (highlightInput === 'both') {
                    if (usernameInput) usernameInput.classList.add('input-error');
                    if (passwordInput) passwordInput.classList.add('input-error');
                    if (usernameInput) usernameInput.focus();
                }
                
                // Tự động xóa highlight sau 3 giây
                setTimeout(() => {
                    if (usernameInput) usernameInput.classList.remove('input-error');
                    if (passwordInput) passwordInput.classList.remove('input-error');
                }, 3000);
            }
            
            if (!usernameInput || !passwordInput) {
                showError('❌ Lỗi: Không tìm thấy form đăng nhập!');
                return;
            }
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            if (!username || !password) {
                showError('❌ Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'both');
                return;
            }
            
            // Chuẩn hóa key từ những gì người dùng nhập (bỏ dấu, khoảng trắng, hoa/thường)
            const key = normalizeKey(username);

            // Ưu tiên tìm trực tiếp theo key trong object accounts
            let account = accountsToUse[key] || null;

            // Nếu không tìm thấy theo key (do dữ liệu cũ, key khác username), duyệt toàn bộ accounts:
            // - so khớp normalizeKey(username) với normalizeKey(acc.username hoặc acc.name)
            if (!account) {
                const allAccounts = Object.values(accountsToUse || {});
                account = allAccounts.find(function (acc) {
                    return normalizeKey(acc && (acc.username || acc.name || '')) === key;
                }) || null;
            }

            // Nếu vẫn không có account, thử tìm trong danh sách bác sĩ theo Họ tên,
            // và tự tạo tài khoản (mật khẩu mặc định 1234) nếu khớp.
            if (!account) {
                let matchedDoctor = null;
                ['lanhdao','cot1','cot2','cot3','partime','khac'].forEach(function (g) {
                    if (matchedDoctor) return;
                    const list = doctors[g] || [];
                    for (let i = 0; i < list.length; i++) {
                        const doc = list[i];
                        if (normalizeKey(doc && doc.name) === key) {
                            matchedDoctor = doc;
                            break;
                        }
                    }
                });

                if (matchedDoctor) {
                    const newKey = key;
                    const newAccount = {
                        username: matchedDoctor.name,
                        password: '1234',
                        role: 'doctor',
                        name: matchedDoctor.name
                    };
                    accounts[newKey] = newAccount;
                    accountsToUse[newKey] = newAccount;
                    try {
                        StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
                    } catch (e) {
                        console.error('Lỗi khi lưu tài khoản mới từ đăng nhập:', e);
                    }
                    account = newAccount;
                }
            }

            if (!account) {
                showError('❌ Tên đăng nhập không tồn tại! Vui lòng kiểm tra lại.', 'username');
                return;
            }

            if (account.password !== password) {
                showError('❌ Mật khẩu không đúng! Vui lòng thử lại.', 'password');
                return;
            }

            try {
                // Xóa highlight và thông báo lỗi trước khi đăng nhập thành công
                if (usernameInput) usernameInput.classList.remove('input-error');
                if (passwordInput) passwordInput.classList.remove('input-error');
                if (errorMsg) {
                    errorMsg.style.display = 'none';
                }
                
                // Xác định lại key chuẩn từ account tìm được (phòng trường hợp khác với key người dùng gõ)
                const resolvedKey = normalizeKey(account.username || account.name || username);
                
                currentUser = {
                    key: resolvedKey,
                    username: account.username || username,
                    name: account.name || account.username || username,
                    role: account.role || 'doctor'
                };
                
                // Lưu currentUser vào localStorage
                try {
                    StorageUtil.saveJson(STORAGE_KEYS.currentUser, currentUser);
                } catch (storageError) {
                    console.error('Lỗi khi lưu vào localStorage:', storageError);
                    showError('❌ Lỗi: Không thể lưu thông tin đăng nhập. Vui lòng kiểm tra cài đặt trình duyệt.');
                    return;
                }
                
                // Hiển thị nội dung chính
                try {
                    showMainContent();
                } catch (contentError) {
                    console.error('Lỗi khi hiển thị nội dung:', contentError);
                    showError('❌ Lỗi: Không thể hiển thị nội dung. Vui lòng tải lại trang.');
                    return;
                }
                
                // Chỉ gọi các hàm này nếu là admin
                if (currentUser && currentUser.role === 'admin') {
                    try {
                        if (typeof displayAccounts === 'function') {
                            displayAccounts();
                        }
                        if (typeof displayPasswordRequests === 'function') {
                            displayPasswordRequests();
                        }
                    } catch (adminError) {
                        console.error('Lỗi khi hiển thị thông tin admin:', adminError);
                        // Không hiển thị lỗi cho user vì đã đăng nhập thành công
                    }
                }
            } catch (error) {
                console.error('Lỗi khi đăng nhập:', error);
                showError('❌ Lỗi hệ thống: ' + (error.message || 'Lỗi không xác định') + '. Vui lòng thử lại sau hoặc tải lại trang.');
            }
        }
        window.handleLogin = handleLogin;

        // Đăng xuất
        function logout() {
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                currentUser = null;
                localStorage.removeItem('currentUser');
                var loginForm = document.getElementById('loginForm');
                if (loginForm) loginForm.reset();
                var loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    showLoginModal();
                } else {
                    // Trang con (pages/*) không có form đăng nhập → chuyển về trang chủ để đăng nhập lại
                    window.location.href = window.location.pathname.indexOf('pages') !== -1 ? '../QuanlynhanlucBS.html' : '/';
                }
            }
        }

        // Kiểm tra đăng nhập khi click tab đăng ký nghỉ phép
        function checkLoginForTab(tabName, buttonElement) {
            if (!currentUser) {
                alert('Vui lòng đăng nhập để sử dụng tính năng này!');
                showLoginModal();
                return;
            }
            switchTab(tabName, buttonElement);
        }

        // Đảm bảo modal đổi mật khẩu có trong DOM (trang con pages/* không có sẵn)
        function ensureChangePasswordModalInDom() {
            if (document.getElementById('changePasswordModal')) return;
            var html = '<div id="changePasswordModal" class="login-modal">' +
                '<div class="login-box">' +
                '<h2>🔑 Đổi Mật Khẩu</h2>' +
                '<div id="changePasswordErrorMessage" class="error-message" style="display: none;"></div>' +
                '<div id="changePasswordSuccessMessage" class="success-message" style="display: none;"></div>' +
                '<form id="changePasswordForm" onsubmit="handleChangePassword(event)">' +
                '<div class="form-group"><label for="currentPassword">Mật Khẩu Hiện Tại <span class="required">*</span></label>' +
                '<div class="password-wrapper"><input type="password" id="currentPassword" required>' +
                '<button type="button" class="password-toggle" onclick="togglePassword(\'currentPassword\', this)" aria-label="Hiện mật khẩu">👁️</button></div></div>' +
                '<div class="form-group"><label for="newPassword">Mật Khẩu Mới <span class="required">*</span></label>' +
                '<div class="password-wrapper"><input type="password" id="newPassword" required minlength="4">' +
                '<button type="button" class="password-toggle" onclick="togglePassword(\'newPassword\', this)" aria-label="Hiện mật khẩu">👁️</button></div></div>' +
                '<div class="form-group"><label for="confirmPassword">Xác Nhận Mật Khẩu Mới <span class="required">*</span></label>' +
                '<div class="password-wrapper"><input type="password" id="confirmPassword" required minlength="4">' +
                '<button type="button" class="password-toggle" onclick="togglePassword(\'confirmPassword\', this)" aria-label="Hiện mật khẩu">👁️</button></div></div>' +
                '<div style="display: flex; gap: 10px;">' +
                '<button type="button" class="submit-btn" onclick="closeChangePassword()" style="background: #95a5a6; flex: 1;">Hủy</button>' +
                '<button type="submit" class="submit-btn" style="flex: 1;">Đổi Mật Khẩu</button></div></form></div></div>';
            var wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            document.body.appendChild(wrap.firstChild);
        }

        // Hiển thị form đổi mật khẩu
        function showChangePassword() {
            ensureChangePasswordModalInDom();
            var modal = document.getElementById('changePasswordModal');
            var form = document.getElementById('changePasswordForm');
            var errEl = document.getElementById('changePasswordErrorMessage');
            var okEl = document.getElementById('changePasswordSuccessMessage');
            if (!modal) return;
            if (form) form.reset();
            if (errEl) errEl.style.display = 'none';
            if (okEl) okEl.style.display = 'none';
            modal.classList.add('active');
        }

        // Đóng form đổi mật khẩu
        function closeChangePassword() {
            var modal = document.getElementById('changePasswordModal');
            if (modal) modal.classList.remove('active');
        }

        // Đảm bảo modal thông báo có trong DOM (trang con pages/* không có sẵn)
        function ensureNotificationsModalInDom() {
            if (document.getElementById('notifModal')) return;
            var html = '<div id="notifModal" class="login-modal">' +
                '<div class="login-box">' +
                '<h2>🔔 Thông báo</h2>' +
                '<div id="notifList" class="notif-list" style="margin-top:10px;"></div>' +
                '<div style="display:flex; gap:10px; margin-top:10px;">' +
                '<button class="submit-btn" onclick="closeNotifications()" style="flex:1; background:#95a5a6">Đóng</button>' +
                '<button class="add-btn" onclick="clearNotifications()" style="flex:1; background:#e74c3c">Xóa tất cả</button>' +
                '</div></div></div>';
            var wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            document.body.appendChild(wrap.firstChild);
        }

        // Notifications
        function openNotifications() {
            ensureNotificationsModalInDom();
            var modal = document.getElementById('notifModal');
            var list = document.getElementById('notifList');
            if (!modal || !list) return;
            list.innerHTML = '<div class="empty-state">Đang tải...</div>';
            (async function () {
                if (typeof loadFromServerIfEnabled === 'function' && USE_DATABASE_BACKEND) {
                    await loadFromServerIfEnabled();
                } else {
                    submissions = StorageUtil.loadJson(STORAGE_KEYS.leaveSubmissions, []);
                    if (!Array.isArray(submissions)) submissions = [];
                }
                updateNotifCount();
                renderNotifList(modal, list);
            })();
        }
        function renderNotifList(modal, list) {
            if (!list) return;
            list.innerHTML = '';
            var key = currentUser && currentUser.key ? currentUser.key : normalizeKey(currentUser && currentUser.username);
            var acc = accounts[key];
            var allNotifs = acc && acc.notifications ? acc.notifications.slice().reverse() : [];
            var notifs = allNotifs.filter(function (n) { return !n.read; });
            
            if (currentUser && currentUser.role === 'admin') {
                passwordRequests = StorageUtil.loadJson(STORAGE_KEYS.passwordRequests, []);
            }
            var pendingPasswordRequests = (passwordRequests || []).filter(function (r) { return !r.processed; });
            var pendingLeaveRequests = getPendingLeaveRequestsForUser();
            
            var hasAny = notifs.length > 0 || pendingLeaveRequests.length > 0 || pendingPasswordRequests.length > 0;
            if (!hasAny) {
                list.innerHTML = '<div class="empty-state">Không có thông báo</div>';
            } else {
                // Admin: hiển thị yêu cầu reset mật khẩu trước
                if (currentUser && currentUser.role === 'admin' && pendingPasswordRequests.length > 0) {
                    var pwHeader = document.createElement('div');
                    pwHeader.style.marginBottom = '15px';
                    pwHeader.style.padding = '10px';
                    pwHeader.style.background = '#e8f4fd';
                    pwHeader.style.borderLeft = '4px solid #3498db';
                    pwHeader.style.borderRadius = '4px';
                    pwHeader.innerHTML = '<strong style="color: #2980b9;">🔐 Yêu cầu reset mật khẩu (' + pendingPasswordRequests.length + ')</strong>';
                    list.appendChild(pwHeader);
                    pendingPasswordRequests.forEach(function (req) {
                        var el = document.createElement('div');
                        el.className = 'password-request-item';
                        el.style.display = 'flex';
                        el.style.justifyContent = 'space-between';
                        el.style.alignItems = 'center';
                        el.style.marginBottom = '10px';
                        el.style.padding = '10px';
                        el.style.background = '#e8f4fd';
                        el.style.borderRadius = '4px';
                        var left = document.createElement('div');
                        left.innerHTML = '<p style="margin:0;"><strong>👤 ' + (req.name || req.username || '') + '</strong></p><p style="font-size:12px;color:#666;margin:2px 0 0 0;">Yêu cầu reset mật khẩu</p>';
                        var right = document.createElement('div');
                        var goBtn = document.createElement('button');
                        goBtn.className = 'add-btn';
                        goBtn.textContent = 'Xem & xử lý';
                        goBtn.style.fontSize = '12px';
                        goBtn.style.padding = '6px 12px';
                        goBtn.onclick = function () {
                            closeNotifications();
                            if (typeof switchTab === 'function') {
                                switchTab('quanlytaikhoan', document.querySelector('.tabs .tab[data-tab="quanlytaikhoan"]'));
                                // Cuộn tới đúng mục "Yêu cầu reset mật khẩu" để xử lý
                                setTimeout(function () {
                                    var el = document.getElementById('passwordRequestList');
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 400);
                            } else {
                                // Trang con: chuyển về trang chủ và mở đúng tab (hash để tự mở tab khi load)
                                window.location.href = window.location.pathname.indexOf('pages') !== -1 ? '../QuanlynhanlucBS.html#quanlytaikhoan' : '/#quanlytaikhoan';
                            }
                        };
                        right.appendChild(goBtn);
                        el.appendChild(left);
                        el.appendChild(right);
                        list.appendChild(el);
                    });
                    var sep = document.createElement('div');
                    sep.style.margin = '15px 0 10px 0';
                    sep.style.height = '1px';
                    sep.style.background = '#eee';
                    list.appendChild(sep);
                }
                
                // Hiển thị yêu cầu nghỉ phép chưa duyệt
                if (pendingLeaveRequests.length > 0) {
                    const leaveHeader = document.createElement('div');
                    leaveHeader.style.marginBottom = '15px';
                    leaveHeader.style.padding = '10px';
                    leaveHeader.style.background = '#fff8e6';
                    leaveHeader.style.borderLeft = '4px solid #f39c12';
                    leaveHeader.style.borderRadius = '4px';
                    leaveHeader.innerHTML = `<strong style="color: #f39c12;">⏳ Yêu cầu nghỉ phép chờ duyệt (${pendingLeaveRequests.length})</strong>`;
                    list.appendChild(leaveHeader);
                    
                    pendingLeaveRequests.forEach(req => {
                        const el = document.createElement('div');
                        el.className = 'password-request-item';
                        el.style.display = 'flex';
                        el.style.justifyContent = 'space-between';
                        el.style.alignItems = 'center';
                        el.style.marginBottom = '10px';
                        el.style.padding = '10px';
                        el.style.background = '#fff8e6';
                        el.style.borderRadius = '4px';
                        
                        const doctorKey = req.doctorKey || normalizeKey(req.doctorName || '');
                        const doctorColumn = getDoctorColumn(doctorKey);
                        const columnInfo = doctorColumn ? ` (${doctorColumn === 'ld' ? 'LĐ' : (doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3'))})` : '';
                        
                        const left = document.createElement('div');
                        left.innerHTML = `<p style="margin:0;"><strong>📝 ${req.doctorName}${columnInfo}</strong></p><p style="font-size:12px;color:#666;margin:2px 0 0 0;">Ngày: ${req.date} | ${req.period === 'morning' ? 'Sáng' : (req.period === 'afternoon' ? 'Chiều' : 'Cả ngày')}</p>${req.notes ? `<p style="font-size:12px;color:#666;margin:2px 0 0 0;">Ghi chú: ${req.notes}</p>` : ''}`;
                        
                        const right = document.createElement('div');
                        right.style.display = 'flex';
                        right.style.gap = '8px';
                        right.style.flexDirection = 'column';
                        right.style.alignItems = 'flex-end';
                        
                        const viewBtn = document.createElement('button');
                        viewBtn.className = 'add-btn';
                        viewBtn.textContent = 'Xem & Duyệt';
                        viewBtn.style.fontSize = '12px';
                        viewBtn.style.padding = '6px 12px';
                        viewBtn.onclick = () => {
                            closeNotifications();
                            var dateStr = req.date;
                            var parts = (dateStr || '').split('-').map(Number);
                            var reqDate = parts.length >= 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dateStr);
                            var isSubpage = (window.location.pathname || '').indexOf('pages') !== -1;
                            if (isSubpage) {
                                sessionStorage.setItem('pendingLeaveReviewDate', dateStr);
                                window.location.href = '../QuanlynhanlucBS.html#quanlynghiphep';
                                return;
                            }
                            var quanlynghiphepBtn = document.querySelector('.tabs .tab[data-tab="quanlynghiphep"]');
                            if (typeof switchTab === 'function') {
                                switchTab('quanlynghiphep', quanlynghiphepBtn || null);
                            }
                            setTimeout(function () {
                                var cal = document.getElementById('adminCalendarContainer');
                                if (cal) cal.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                if (typeof onAdminDateClick === 'function') onAdminDateClick(reqDate);
                            }, 600);
                        };
                        right.appendChild(viewBtn);
                        
                        el.appendChild(left);
                        el.appendChild(right);
                        list.appendChild(el);
                    });
                    
                    // Thêm đường phân cách nếu có cả thông báo thường
                    if (notifs.length > 0) {
                        const separator = document.createElement('div');
                        separator.style.margin = '20px 0 15px 0';
                        separator.style.padding = '10px';
                        separator.style.background = '#f5f5f5';
                        separator.style.borderRadius = '4px';
                        separator.innerHTML = '<strong style="color: #666;">📬 Thông báo khác</strong>';
                        list.appendChild(separator);
                    }
                }
                
                // Hiển thị thông báo thường
                if (notifs.length > 0) {
                notifs.forEach(n => {
                    const el = document.createElement('div');
                    el.className = 'password-request-item';
                    el.style.display = 'flex';
                    el.style.justifyContent = 'space-between';
                    el.style.alignItems = 'center';
                    const left = document.createElement('div');
                    left.innerHTML = `<p style="margin:0;"><strong>${n.message}</strong></p><p style="font-size:12px;color:#666;margin:0;">Ngày: ${n.date} | ${n.period}</p>`;
                    const right = document.createElement('div');
                    right.style.display = 'flex';
                    right.style.gap = '8px';
                    const markBtn = document.createElement('button');
                    markBtn.className = 'add-btn';
                    markBtn.textContent = n.read ? 'Đã đọc' : 'Đánh dấu đã đọc';
                    if (n.read) markBtn.disabled = true;
                    markBtn.onclick = () => markNotificationRead(n.id);
                    right.appendChild(markBtn);
                    el.appendChild(left);
                    el.appendChild(right);
                    list.appendChild(el);
                });
                }
            }
            if (modal) {
                modal.classList.add('active');
                // Đóng modal khi click bên ngoài (vào overlay)
                modal.onclick = function (e) {
                    if (e.target === modal) closeNotifications();
                };
            }
        }
        window.openNotifications = openNotifications;

        function closeNotifications() {
            var modal = document.getElementById('notifModal');
            if (modal) modal.classList.remove('active');
        }
        window.closeNotifications = closeNotifications;

        function clearNotifications() {
            var key = currentUser && currentUser.key ? currentUser.key : normalizeKey(currentUser && currentUser.username);
            if (accounts[key]) {
                accounts[key].notifications = [];
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
                if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            }
            closeNotifications();
            updateNotifCount();
        }
        window.clearNotifications = clearNotifications;

        // Lấy danh sách yêu cầu nghỉ phép chưa duyệt mà user có quyền duyệt
        function getPendingLeaveRequestsForUser() {
            if (!currentUser) return [];
            
            // Admin có thể duyệt tất cả
            const isAdmin = currentUser.role === 'admin';
            
            // Lấy tất cả yêu cầu đang chờ duyệt
            const pendingRequests = submissions.filter(s => s.status === 'pending');
            
            if (isAdmin) {
                return pendingRequests;
            }
            
            // Bác sĩ: chỉ lấy các yêu cầu thuộc cộtmà họ có quyền duyệt
            return pendingRequests.filter(req => {
                const doctorKey = req.doctorKey || normalizeKey(req.doctorName || '');
                const doctorColumn = getDoctorColumn(doctorKey);
                
                // Nếu không xác định được cột, bỏ qua
                if (!doctorColumn) return false;
                
                // Kiểm tra quyền duyệt cho cộtđó
                return hasPermissionForDuyetNghiPhepColumn(doctorColumn);
            });
        }

        function updateNotifCount() {
            var el = document.getElementById('notifCount');
            if (!currentUser) {
                if (el) el.style.display = 'none';
                return;
            }
            // Đọc lại yêu cầu nghỉ phép từ localStorage để badge admin luôn đúng (kể cả trang con)
            submissions = StorageUtil.loadJson(STORAGE_KEYS.leaveSubmissions, []);
            if (!Array.isArray(submissions)) submissions = [];
            var key = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
            var acc = accounts[key] || {};
            var n = (acc.notifications || []).filter(function (n) { return !n.read; }).length;
            
            // Đếm số yêu cầu nghỉ phép chưa duyệt mà user có quyền duyệt
            var pendingLeaveRequests = getPendingLeaveRequestsForUser();
            var leaveRequestCount = pendingLeaveRequests.length;
            
            // Admin: đếm thêm yêu cầu reset mật khẩu chưa xử lý (đọc mới từ localStorage để badge đúng)
            var passwordRequestCount = 0;
            if (currentUser.role === 'admin') {
                var pwList = StorageUtil.loadJson(STORAGE_KEYS.passwordRequests, []);
                var pending = (pwList || []).filter(function (r) { return !r.processed; });
                passwordRequestCount = pending.length;
            }
            
            // Tổng số thông báo = thông báo thường + yêu cầu nghỉ phép + yêu cầu reset mật khẩu (admin)
            var totalCount = n + leaveRequestCount + passwordRequestCount;
            
            if (el) {
                if (totalCount > 0) {
                    el.style.display = 'inline-block';
                    el.textContent = totalCount;
                } else {
                    el.style.display = 'none';
                }
            }
        }
        window.updateNotifCount = updateNotifCount;

        function markNotificationRead(id) {
            var key = currentUser && currentUser.key ? currentUser.key : normalizeKey(currentUser && currentUser.username);
            if (!accounts[key] || !accounts[key].notifications) return;
            var idx = accounts[key].notifications.findIndex(function (n) { return n.id === id; });
            if (idx === -1) return;
            accounts[key].notifications[idx].read = true;
            StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            var modal = document.getElementById('notifModal');
            var list = document.getElementById('notifList');
            if (modal && list) renderNotifList(modal, list);
            updateNotifCount();
        }
        window.markNotificationRead = markNotificationRead;

        // ========== BVTA LINK ==========
        
        // Mở modal BVTA
        function openBVTA() {
            const modal = document.getElementById('bvtaModal');
            if (modal) {
                modal.classList.add('active');
            }
        }

        // Đóng modal BVTA
        function closeBVTA() {
            const modal = document.getElementById('bvtaModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        // Xử lý form tính tuổi thai và dự kiến sinh
        (function initBVTAForm() {
            const form = document.getElementById('bvtaDuKienSinhForm');
            if (!form) return;

            form.addEventListener('submit', function (event) {
                event.preventDefault();

                const ngayChuyenPhoi = document.getElementById('bvta-ngayChuyenPhoi').value ? new Date(document.getElementById('bvta-ngayChuyenPhoi').value) : null;
                const loaiPhoi = parseInt(document.getElementById('bvta-loaiPhoi').value);
                const ngayBomIUI = document.getElementById('bvta-ngayBomIUI').value ? new Date(document.getElementById('bvta-ngayBomIUI').value) : null;
                const ngayDauKyKinh = document.getElementById('bvta-ngayDauKyKinh').value ? new Date(document.getElementById('bvta-ngayDauKyKinh').value) : null;
                const ngayDuSinh = document.getElementById('bvta-ngayDuSinh').value ? new Date(document.getElementById('bvta-ngayDuSinh').value) : null;

                const hienTai = new Date();
                const msMotTuan = 1000 * 60 * 60 * 24 * 7;

                const tinhTuoiThai = (ngay) => Math.floor((hienTai - ngay) / msMotTuan);

                const tinhDuKienSinh = (ngay, congThem = 280) => {
                    const duKien = new Date(ngay);
                    duKien.setDate(duKien.getDate() + congThem);
                    return duKien.toLocaleDateString('vi-VN');
                };

                let ketQua = '';

                // IVF (phôi ngày 3 hoặc ngày 5)
                if (ngayChuyenPhoi) {
                    const ngayBatDauThaiKy = new Date(ngayChuyenPhoi);
                    ngayBatDauThaiKy.setDate(ngayBatDauThaiKy.getDate() - (14 - loaiPhoi));
                    const duKienSinh = tinhDuKienSinh(ngayBatDauThaiKy);
                    ketQua += `<p>🌱 IVF - Phôi ngày ${loaiPhoi}: <b>${tinhTuoiThai(ngayBatDauThaiKy)} tuần</b> → Dự kiến sinh: <b>${duKienSinh}</b></p>`;
                }

                // IUI
                if (ngayBomIUI) {
                    ketQua += `<p>💉 IUI: <b>${tinhTuoiThai(ngayBomIUI)} tuần</b> → Dự kiến sinh: <b>${tinhDuKienSinh(ngayBomIUI)}</b></p>`;
                }

                // Theo kỳ kinh
                if (ngayDauKyKinh) {
                    ketQua += `<p>🩸 Kỳ kinh cuối: <b>${tinhTuoiThai(ngayDauKyKinh)} tuần</b> → Dự kiến sinh: <b>${tinhDuKienSinh(ngayDauKyKinh)}</b></p>`;
                }

                // Ngược lại từ ngày dự sinh → tuổi thai hiện tại
                if (ngayDuSinh) {
                    const ngayBatDau = new Date(ngayDuSinh);
                    ngayBatDau.setDate(ngayBatDau.getDate() - 280);
                    ketQua += `<p>📅 Ngày dự sinh: <b>${ngayDuSinh.toLocaleDateString('vi-VN')}</b><br>→ Thai được khoảng: <b>${tinhTuoiThai(ngayBatDau)} tuần</b></p>`;
                }

                if (!ketQua) {
                    ketQua = '<p style="color:red;">⚠️ Vui lòng nhập ít nhất một thông tin để tính tuổi thai hoặc ngày dự sinh.</p>';
                }

                const resultDiv = document.getElementById('bvta-ketQuaDinhTuoiThai');
                if (resultDiv) {
                    resultDiv.innerHTML = ketQua;
                    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        })();

        // Đóng modal khi click bên ngoài
        document.addEventListener('click', (e) => {
            const bvtaModal = document.getElementById('bvtaModal');
            if (bvtaModal && e.target === bvtaModal) {
                closeBVTA();
            }
        });

        // ========== QUẢN LÝ QUY ĐỊNH CHUNG ==========
        
        // Mở modal quy định chung
        function openQuyDinhChung() {
            const modal = document.getElementById('quydinhModal');
            if (!modal) return;
            
            // Load dữ liệu từ localStorage
            quydinhData = StorageUtil.loadJson(STORAGE_KEYS.quydinhData, quydinhData);
            
            renderQuyDinhTabs();
            switchQuyDinhTab(quydinhData.activeTabId || quydinhData.tabs[0]?.id);
            modal.classList.add('active');
        }

        // Đóng modal quy định chung
        function closeQuyDinhChung() {
            const modal = document.getElementById('quydinhModal');
            if (modal) modal.classList.remove('active');
            saveQuyDinhData();
        }

        // Render danh sách tabs
        function renderQuyDinhTabs() {
            const tabsList = document.getElementById('quydinhTabsList');
            const content = document.getElementById('quydinhContent');
            if (!tabsList || !content) return;

            tabsList.innerHTML = '';
            content.innerHTML = '';

            quydinhData.tabs.forEach((tab, index) => {
                // Tạo tab button
                const tabBtn = document.createElement('button');
                tabBtn.className = 'quydinh-tab';
                tabBtn.id = `quydinh-tab-${tab.id}`;
                tabBtn.onclick = () => switchQuyDinhTab(tab.id);
                
                const tabContent = document.createElement('span');
                tabContent.textContent = tab.name;
                tabBtn.appendChild(tabContent);

                // Thêm nút sửa và xóa
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'quydinh-tab-actions';
                actionsDiv.style.display = 'inline-flex';
                actionsDiv.style.marginLeft = '10px';
                actionsDiv.style.gap = '5px';

                const editBtn = document.createElement('button');
                editBtn.className = 'quydinh-tab-edit';
                editBtn.innerHTML = '✏️';
                editBtn.title = 'Sửa tên tab';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    showEditTabModal(tab.id);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'quydinh-tab-delete';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.title = 'Xóa tab';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Bạn có chắc muốn xóa tab "${tab.name}"?`)) {
                        deleteQuyDinhTab(tab.id);
                    }
                };

                actionsDiv.appendChild(editBtn);
                actionsDiv.appendChild(deleteBtn);
                tabBtn.appendChild(actionsDiv);
                tabsList.appendChild(tabBtn);

                // Tạo tab content
                const tabContentDiv = document.createElement('div');
                tabContentDiv.className = 'quydinh-tab-content';
                tabContentDiv.id = `quydinh-content-${tab.id}`;
                
                const editor = document.createElement('textarea');
                editor.className = 'quydinh-editor';
                editor.id = `quydinh-editor-${tab.id}`;
                editor.value = tab.content || '';
                editor.placeholder = `Nhập nội dung cho ${tab.name}...`;
                
                // Auto-save với debounce
                let saveTimeout;
                editor.oninput = () => {
                    const tabData = quydinhData.tabs.find(t => t.id === tab.id);
                    if (tabData) {
                        tabData.content = editor.value;
                    }
                    
                    // Clear timeout cũ
                    if (saveTimeout) clearTimeout(saveTimeout);
                    
                    // Lưu sau 1 giây không nhập
                    saveTimeout = setTimeout(() => {
                        saveQuyDinhData();
                    }, 1000);
                };

                const saveBtn = document.createElement('button');
                saveBtn.className = 'quydinh-save-btn';
                saveBtn.textContent = '💾 Lưu nội dung';
                saveBtn.onclick = () => {
                    const tabData = quydinhData.tabs.find(t => t.id === tab.id);
                    if (tabData) {
                        tabData.content = editor.value;
                        saveQuyDinhData();
                        alert('Đã lưu nội dung thành công!');
                    }
                };

                tabContentDiv.appendChild(editor);
                tabContentDiv.appendChild(saveBtn);
                content.appendChild(tabContentDiv);
            });
        }

        // Chuyển tab
        function switchQuyDinhTab(tabId) {
            // Cập nhật active tab
            quydinhData.activeTabId = tabId;
            saveQuyDinhData();

            // Cập nhật UI
            document.querySelectorAll('.quydinh-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.quydinh-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const tabBtn = document.getElementById(`quydinh-tab-${tabId}`);
            const tabContent = document.getElementById(`quydinh-content-${tabId}`);
            
            if (tabBtn) tabBtn.classList.add('active');
            if (tabContent) tabContent.classList.add('active');
        }

        // Hiển thị modal thêm/sửa tab
        let currentEditingTabId = null;
        function showAddTabModal() {
            currentEditingTabId = null;
            document.getElementById('tabEditTitle').textContent = 'Thêm Tab Mới';
            document.getElementById('tabEditInput').value = '';
            document.getElementById('tabEditModal').classList.add('active');
            document.getElementById('tabEditInput').focus();
        }

        function showEditTabModal(tabId) {
            const tab = quydinhData.tabs.find(t => t.id === tabId);
            if (!tab) return;
            
            currentEditingTabId = tabId;
            document.getElementById('tabEditTitle').textContent = 'Sửa Tên Tab';
            document.getElementById('tabEditInput').value = tab.name;
            document.getElementById('tabEditModal').classList.add('active');
            document.getElementById('tabEditInput').focus();
        }

        function closeTabEditModal() {
            document.getElementById('tabEditModal').classList.remove('active');
            currentEditingTabId = null;
        }

        function saveTabEdit() {
            const input = document.getElementById('tabEditInput');
            const name = input.value.trim();
            
            if (!name) {
                alert('Vui lòng nhập tên tab!');
                return;
            }

            if (currentEditingTabId) {
                // Sửa tab
                const tab = quydinhData.tabs.find(t => t.id === currentEditingTabId);
                if (tab) {
                    tab.name = name;
                }
            } else {
                // Thêm tab mới
                const newTab = {
                    id: 'tab' + Date.now(),
                    name: name,
                    content: ''
                };
                quydinhData.tabs.push(newTab);
            }

            saveQuyDinhData();
            renderQuyDinhTabs();
            if (currentEditingTabId) {
                switchQuyDinhTab(currentEditingTabId);
            } else {
                const newTab = quydinhData.tabs[quydinhData.tabs.length - 1];
                switchQuyDinhTab(newTab.id);
            }
            closeTabEditModal();
        }

        // Xóa tab
        function deleteQuyDinhTab(tabId) {
            if (quydinhData.tabs.length <= 1) {
                alert('Phải có ít nhất 1 tab!');
                return;
            }

            quydinhData.tabs = quydinhData.tabs.filter(t => t.id !== tabId);
            
            // Nếu tab bị xóa là tab đang active, chuyển sang tab đầu tiên
            if (quydinhData.activeTabId === tabId) {
                quydinhData.activeTabId = quydinhData.tabs[0]?.id;
            }

            saveQuyDinhData();
            renderQuyDinhTabs();
            switchQuyDinhTab(quydinhData.activeTabId);
        }

        // Lưu dữ liệu quy định chung
        function saveQuyDinhData() {
            // Cập nhật nội dung từ các editor
            quydinhData.tabs.forEach(tab => {
                const editor = document.getElementById(`quydinh-editor-${tab.id}`);
                if (editor) {
                    tab.content = editor.value;
                }
            });
            
            StorageUtil.saveJson(STORAGE_KEYS.quydinhData, quydinhData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // Đóng modal khi click bên ngoài
        document.addEventListener('click', (e) => {
            const quydinhModal = document.getElementById('quydinhModal');
            const tabEditModal = document.getElementById('tabEditModal');
            
            if (quydinhModal && e.target === quydinhModal) {
                closeQuyDinhChung();
            }
            
            if (tabEditModal && e.target === tabEditModal) {
                closeTabEditModal();
            }
        });

        // Xử lý đổi mật khẩu
        function handleChangePassword(event) {
            event.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorMsg = document.getElementById('changePasswordErrorMessage');
            const successMsg = document.getElementById('changePasswordSuccessMessage');

            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            const accKey = currentUser && currentUser.key ? currentUser.key : normalizeKey(currentUser && currentUser.username);
            if (!accounts[accKey] || accounts[accKey].password !== currentPassword) {
                errorMsg.textContent = '❌ Mật khẩu hiện tại không đúng!';
                errorMsg.style.display = 'block';
                return;
            }

            if (newPassword.length < 4) {
                errorMsg.textContent = '❌ Mật khẩu mới phải có ít nhất 4 ký tự!';
                errorMsg.style.display = 'block';
                return;
            }

            if (newPassword !== confirmPassword) {
                errorMsg.textContent = '❌ Mật khẩu xác nhận không khớp!';
                errorMsg.style.display = 'block';
                return;
            }

            accounts[accKey].password = newPassword;
            StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);

            successMsg.textContent = '✅ Đổi mật khẩu thành công!';
            successMsg.style.display = 'block';

            setTimeout(() => {
                closeChangePassword();
            }, 2000);
        }

        // Yêu cầu reset mật khẩu
        function requestPasswordReset() {
            const usernameInput = document.getElementById('loginUsername');
            if (!usernameInput) {
                alert('Không tìm thấy trường tên đăng nhập!');
                return;
            }
            
            const username = usernameInput.value.trim();
            if (!username) {
                alert('Vui lòng nhập tên đăng nhập trước!');
                return;
            }
            const key = normalizeKey(username);
            if (!accounts[key]) {
                alert('Tên đăng nhập không tồn tại!');
                return;
            }

            // Kiểm tra xem đã có yêu cầu chưa
            const existingRequest = passwordRequests.find(r => r.usernameKey === key && !r.processed);
            if (existingRequest) {
                alert('Bạn đã có yêu cầu reset mật khẩu đang chờ xử lý!');
                return;
            }

            passwordRequests.push({
                id: Date.now(),
                usernameKey: key,
                username: accounts[key].username,
                name: accounts[key].name,
                requestDate: new Date().toISOString(),
                processed: false
            });
            StorageUtil.saveJson(STORAGE_KEYS.passwordRequests, passwordRequests);
            // Đồng bộ lên server để admin (có thể dùng máy khác) thấy yêu cầu
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();

            alert('✅ Yêu cầu reset mật khẩu đã được gửi đến admin. Vui lòng chờ admin xử lý!');
            displayPasswordRequests();
        }

        // Reset mật khẩu (Admin)
        function resetPassword(requestId) {
            const request = passwordRequests.find(r => r.id === requestId);
            if (!request) return;

            if (confirm(`Bạn có chắc chắn muốn reset mật khẩu cho ${request.name}?`)) {
                const key = request.usernameKey || normalizeKey(request.username);
                if (accounts[key]) {
                    accounts[key].password = '1234';
                    StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
                }

                request.processed = true;
                StorageUtil.saveJson(STORAGE_KEYS.passwordRequests, passwordRequests);
                if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();

                displayPasswordRequests();
                displayAccounts();
                alert(`✅ Đã reset mật khẩu cho ${request.name} về mặc định: 1234`);
            }
        }

        // Hiển thị danh sách tài khoản
        function displayAccounts() {
            const container = document.getElementById('accountList');
            if (!container) return;
            const accountList = Object.values(accounts).filter(acc => acc.role === 'doctor');
            if (accountList.length === 0) {
                container.innerHTML = '<div class="empty-state">Chưa có tài khoản nào</div>';
                return;
            }

            container.innerHTML = accountList.map(account => `
                <div class="doctor-item">
                    <div class="doctor-info">
                        <strong>${account.name}</strong>
                        <span>👤 Tên đăng nhập: ${account.username}</span>
                        <div style="font-size:12px;color:#666;">Mật khẩu mặc định (nếu chưa đổi): 1234</div>
                    </div>
                </div>
            `).join('');
        }

        // Hiển thị danh sách yêu cầu reset mật khẩu
        function displayPasswordRequests() {
            const container = document.getElementById('passwordRequestList');
            if (!container) return;
            // Luôn lấy mới từ localStorage (và từ server nếu đã gọi loadFromServerIfEnabled trước đó) để admin thấy yêu cầu mới
            passwordRequests = StorageUtil.loadJson(STORAGE_KEYS.passwordRequests, []);

            const pendingRequests = passwordRequests.filter(r => !r.processed);
            
            if (pendingRequests.length === 0) {
                container.innerHTML = '<div class="empty-state">Chưa có yêu cầu nào</div>';
                return;
            }

            container.innerHTML = pendingRequests.map(request => {
                const requestDate = new Date(request.requestDate).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return `
                    <div class="password-request-item">
                        <div>
                            <p><strong>${request.name}</strong></p>
                            <p style="font-size: 12px; color: #666; margin-top: 5px;">Yêu cầu lúc: ${requestDate}</p>
                        </div>
                        <button class="reset-btn" onclick="resetPassword(${request.id})">Reset về 1234</button>
                    </div>
                `;
            }).join('');
        }

        // ========== Phân Quyền Functions ==========
        
        // Danh sách các tab mặc định có thể phân quyền (backup)
        const defaultPermissionTabs = [
            { id: 'lanhdao', name: 'Lãnh đạo' },
            { id: 'cot1', name: 'cột1' },
            { id: 'cot2', name: 'cột2' },
            { id: 'cot3', name: 'cột3' },
            { id: 'partime', name: 'Partime' },
            { id: 'khac', name: 'Bác Sĩ Khác' },
            { id: 'cvcot23', name: 'Lịch cv cột2+3' },
            { id: 'livetream', name: 'Lịch livetream' },
            { id: 'tang4', name: 'Lịch tầng 4' },
            { id: 'hoichancot1', name: 'Lịch hội chẩn cột1' },
            { id: 'khamcaugiay', name: 'Lịch khám Cầu Giấy' },
            { id: 'khamlongbien', name: 'Lịch khám Long Biên' },
            { id: 'khamsomTruaLB', name: 'Lịch khám sớm + khám trưa Long Biên' },
            { id: 'tieuphau', name: 'Lịch tiểu phẫu' },
            { id: 'khamcaugiay20h', name: 'Lịch khám Cầu Giấy buổi trưa +20h' },
            { id: 'khamsanSieuamVip', name: 'Lịch khám Sản + Siêu âm VIP' },
            { id: 'lichlamviec', name: 'Lịch làm việc' },
            { id: 'phumo', name: 'Lịch phụ mổ' },
            { id: 'khamhotropk', name: 'Khám hỗ trợ PK' },
            { id: 'nghiphep', name: 'Đăng Ký Nghỉ Phép' },
            { id: 'lichtruc', name: 'Lịch Trực' },
            { id: 'hosobenhnhan', name: 'Hồ Sơ Bệnh Án' },
            { id: 'quanlynghiphep_ld', name: 'Quản lý & Duyệt nghỉ phép - Lãnh đạo (LĐ)' },
            { id: 'quanlynghiphep_c1', name: 'Quản lý & Duyệt nghỉ phép - cột1' },
            { id: 'quanlynghiphep_c2', name: 'Quản lý & Duyệt nghỉ phép - cột2' },
            { id: 'quanlynghiphep_c3', name: 'Quản lý & Duyệt nghỉ phép - cột3' }
        ];
        
        // Danh sách các tab có thể phân quyền (động, tự động cập nhật)
        let permissionTabs = StorageUtil.loadJson(STORAGE_KEYS.permissionTabs, []);
        
        // Danh sách các tab không được phân quyền (chỉ dành cho admin)
        const excludedTabs = ['quanlytaikhoan', 'quanlynghiphep', 'loginModal'];
        
        // Hàm tự động quét và cập nhật danh sách tab có thể phân quyền
        function scanAndUpdatePermissionTabs() {
            const foundTabs = [];
            const tabMap = new Map(); // Dùng Map để tránh trùng lặp
            
            // Quét từ các nút tab trong header (đã chuẩn hoá bằng data-tab)
            document.querySelectorAll('.tabs .tab[data-tab]').forEach(tabBtn => {
                const tabId = (tabBtn.getAttribute('data-tab') || '').trim();
                if (!tabId) return;
                // Bỏ qua các tab không được phân quyền
                if (excludedTabs.includes(tabId)) return;
                const tabName = tabBtn.textContent.trim();
                if (tabName && !tabMap.has(tabId)) {
                    tabMap.set(tabId, tabName);
                }
            });
            
            // Quét từ các tab content có id
            document.querySelectorAll('.tab-content[id]').forEach(tabContent => {
                const tabId = tabContent.id;
                // Bỏ qua các tab không được phân quyền
                if (!excludedTabs.includes(tabId)) {
                    // Tìm tên tab từ nút tương ứng (chuẩn hoá bằng data-tab)
                    const tabBtn = document.querySelector(`.tabs .tab[data-tab="${CSS.escape(tabId)}"]`);
                    let tabName = tabId;
                    if (tabBtn) {
                        tabName = tabBtn.textContent.trim() || tabId;
                    } else {
                        // Nếu không tìm thấy nút, dùng id làm tên
                        tabName = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace(/([A-Z])/g, ' $1');
                    }
                    
                    if (!tabMap.has(tabId)) {
                        tabMap.set(tabId, tabName);
                    }
                }
            });
            
            // Chuyển Map thành mảng
            tabMap.forEach((name, id) => {
                foundTabs.push({ id: id, name: name });
            });
            
            // Thêm các quyền từ defaultPermissionTabs nếu chưa có (như quanlynghiphep_c1, c2, c3)
            defaultPermissionTabs.forEach(defaultTab => {
                if (!tabMap.has(defaultTab.id)) {
                    foundTabs.push({ id: defaultTab.id, name: defaultTab.name });
                }
            });
            
            // Sắp xếp theo thứ tự xuất hiện trong DOM hoặc theo tên
            foundTabs.sort((a, b) => {
                // Ưu tiên giữ thứ tự từ defaultPermissionTabs nếu có
                const indexA = defaultPermissionTabs.findIndex(t => t.id === a.id);
                const indexB = defaultPermissionTabs.findIndex(t => t.id === b.id);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.name.localeCompare(b.name, 'vi');
            });
            
            // Cập nhật permissionTabs nếu có thay đổi
            const currentIds = permissionTabs.map(t => t.id).sort().join(',');
            const foundIds = foundTabs.map(t => t.id).sort().join(',');
            
            if (currentIds !== foundIds || foundTabs.length > permissionTabs.length) {
                permissionTabs = foundTabs;
                StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
                console.log('✅ Đã tự động cập nhật danh sách tab phân quyền:', permissionTabs);
            }
            
            return permissionTabs;
        }
        
        // Khởi tạo danh sách tab khi trang load
        if (permissionTabs.length === 0) {
            permissionTabs = [...defaultPermissionTabs];
            StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
        } else {
            // Đảm bảo các quyền từ defaultPermissionTabs luôn có trong permissionTabs
            let updated = false;
            defaultPermissionTabs.forEach(defaultTab => {
                if (!permissionTabs.find(t => t.id === defaultTab.id)) {
                    permissionTabs.push(defaultTab);
                    updated = true;
                }
            });
            if (updated) {
                // Sắp xếp lại theo thứ tự defaultPermissionTabs
                permissionTabs.sort((a, b) => {
                    const indexA = defaultPermissionTabs.findIndex(t => t.id === a.id);
                    const indexB = defaultPermissionTabs.findIndex(t => t.id === b.id);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.name.localeCompare(b.name, 'vi');
                });
                StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
            }
        }
        
        // Quét lại khi DOM sẵn sàng
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(scanAndUpdatePermissionTabs, 500);
            });
        } else {
            setTimeout(scanAndUpdatePermissionTabs, 500);
        }

        // Kiểm tra xem bác sĩ có quyền chỉnh sửa ở tab này không
        function hasPermission(tabName) {
            // Admin luôn có quyền
            if (currentUser && currentUser.role === 'admin') {
                return true;
            }
            // Bác sĩ cần có quyền được cấp
            if (currentUser && currentUser.role === 'doctor') {
                const doctorKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
                return permissions[doctorKey] && permissions[doctorKey][tabName] === true;
            }
            return false;
        }
        
        // Xác định cộtcủa bác sĩ dựa trên doctorKey
        function getDoctorColumn(doctorKey) {
            const normalizedKey = normalizeKey(doctorKey);
            if (doctors.lanhdao && doctors.lanhdao.some(doc => normalizeKey(doc.name || doc.displayName || '') === normalizedKey)) {
                return 'ld';
            }
            if (doctors.cot1.some(doc => normalizeKey(doc.name || doc.displayName || '') === normalizedKey)) {
                return 'c1';
            }
            if (doctors.cot2.some(doc => normalizeKey(doc.name || doc.displayName || '') === normalizedKey)) {
                return 'c2';
            }
            if (doctors.cot3.some(doc => normalizeKey(doc.name || doc.displayName || '') === normalizedKey)) {
                return 'c3';
            }
            return null; // Không thuộc cộtnào
        }
        
        // Kiểm tra quyền duyệt nghỉ phép theo cột(sử dụng chung quyền với quản lý nghỉ phép)
        function hasPermissionForDuyetNghiPhepColumn(column) {
            // Sử dụng chung quyền với quản lý nghỉ phép
            return hasPermissionForNghiPhepColumn(column);
        }
        
        // Kiểm tra quyền chọn bác sĩ nghỉ phép cho từng cột (quản lý/duyệt nghỉ phép, không áp dụng cho đăng ký cho bản thân)
        function hasPermissionForNghiPhepColumn(column) {
            // Admin luôn có quyền
            if (currentUser && currentUser.role === 'admin') {
                return true;
            }
            // Bác sĩ cần có quyền được cấp cho cộttương ứng
            if (currentUser && currentUser.role === 'doctor') {
                const doctorKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
                const permissionKey = `quanlynghiphep_${column}`;
                return permissions[doctorKey] && permissions[doctorKey][permissionKey] === true;
            }
            return false;
        }

        // Tài khoản cá nhân (bác sĩ) mặc định có quyền đăng ký nghỉ phép cho bản thân (không phụ thuộc quanlynghiphep_c1/c2/c3)
        function canRegisterOwnLeave() {
            if (!currentUser) return false;
            if (currentUser.role === 'admin') return true;
            if (currentUser.role === 'doctor') return true;
            return false;
        }

        // Đảm bảo modal phân quyền có trong DOM (trang con pages/quanlytaikhoan.html không có sẵn)
        function ensurePermissionsModalInDom() {
            if (document.getElementById('permissionsModal')) return;
            const html = `
                <div id="permissionsModal" class="login-modal">
                    <div class="login-box" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                        <h2>🔐 Phân Quyền Chỉnh Sửa</h2>
                        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">Chọn quyền chỉnh sửa cho từng bác sĩ ở từng tab/nút:</p>
                        <div id="permissionsContent" style="margin-bottom: 20px;"></div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" class="submit-btn" onclick="closePermissionsModal()" style="background:#95a5a6; flex:1;">Đóng</button>
                            <button type="button" class="submit-btn" onclick="saveAllPermissions()" style="flex:1; background:#27ae60;">💾 Lưu Tất Cả</button>
                        </div>
                    </div>
                </div>`;
            const wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            document.body.appendChild(wrap.firstChild);
        }

        // Mở modal phân quyền
        function openPermissionsModal() {
            ensurePermissionsModalInDom();
            // Đảm bảo các quyền từ defaultPermissionTabs luôn có trong permissionTabs
            let updated = false;
            defaultPermissionTabs.forEach(defaultTab => {
                if (!permissionTabs.find(t => t.id === defaultTab.id)) {
                    permissionTabs.push(defaultTab);
                    updated = true;
                }
            });
            if (updated) {
                permissionTabs.sort((a, b) => {
                    const indexA = defaultPermissionTabs.findIndex(t => t.id === a.id);
                    const indexB = defaultPermissionTabs.findIndex(t => t.id === b.id);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.name.localeCompare(b.name, 'vi');
                });
                StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
            }
            scanAndUpdatePermissionTabs();
            const modal = document.getElementById('permissionsModal');
            const content = document.getElementById('permissionsContent');
            if (!modal || !content) return;

            // Lấy danh sách tất cả bác sĩ
            const doctorAccounts = Object.values(accounts).filter(acc => acc.role === 'doctor');
            
            if (doctorAccounts.length === 0) {
                content.innerHTML = '<div class="empty-state">Chưa có bác sĩ nào</div>';
                modal.classList.add('active');
                return;
            }

            let html = '<div style="display: grid; gap: 15px;">';
            
            doctorAccounts.forEach(account => {
                const doctorKey = normalizeKey(account.username || account.name);
                html += `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="margin: 0; color: #333;">${account.name}</h4>
                            <div style="display: flex; gap: 8px;">
                                <button type="button" 
                                        onclick="selectAllPermissionsForDoctor('${doctorKey}')" 
                                        style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                    ✅ Chọn tất cả
                                </button>
                                <button type="button" 
                                        onclick="clearAllPermissionsForDoctor('${doctorKey}')" 
                                        style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                    ❌ Xóa tất cả
                                </button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;" id="permissions-${doctorKey}">
                `;
                
                permissionTabs.forEach(tab => {
                    const hasPerm = permissions[doctorKey] && permissions[doctorKey][tab.id] === true;
                    html += `
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; background: white; border-radius: 4px;">
                            <input type="checkbox" 
                                   id="perm-${doctorKey}-${tab.id}"
                                   ${hasPerm ? 'checked' : ''} 
                                   onchange="togglePermission('${doctorKey}', '${tab.id}', this.checked)"
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 13px;">${tab.name}</span>
                        </label>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            content.innerHTML = html;
            modal.classList.add('active');
        }

        // Đóng modal phân quyền
        function closePermissionsModal() {
            const modal = document.getElementById('permissionsModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        // Bật/tắt quyền cho một bác sĩ ở một tab
        function togglePermission(doctorKey, tabName, enabled) {
            if (!permissions[doctorKey]) {
                permissions[doctorKey] = {};
            }
            permissions[doctorKey][tabName] = enabled;
            savePermissions();
        }
        
        // Chọn tất cả quyền cho một bác sĩ
        function selectAllPermissionsForDoctor(doctorKey) {
            if (!permissions[doctorKey]) {
                permissions[doctorKey] = {};
            }
            
            // Chọn tất cả các tab
            permissionTabs.forEach(tab => {
                permissions[doctorKey][tab.id] = true;
                // Cập nhật checkbox trong UI
                const checkbox = document.getElementById(`perm-${doctorKey}-${tab.id}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            savePermissions();
        }
        
        // Xóa tất cả quyền cho một bác sĩ
        function clearAllPermissionsForDoctor(doctorKey) {
            if (!permissions[doctorKey]) {
                permissions[doctorKey] = {};
            }
            
            // Xóa tất cả các tab
            permissionTabs.forEach(tab => {
                permissions[doctorKey][tab.id] = false;
                // Cập nhật checkbox trong UI
                const checkbox = document.getElementById(`perm-${doctorKey}-${tab.id}`);
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
            
            savePermissions();
        }

        // Lưu tất cả phân quyền
        function saveAllPermissions() {
            savePermissions();
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            alert('✅ Đã lưu phân quyền thành công!');
            closePermissionsModal();
            // Cập nhật lại thông báo quyền ở đầu tab đang xem (để tài khoản cá nhân thấy ngay)
            var activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id && currentUser && currentUser.role === 'doctor') {
                updatePermissionNoticeForTab(activeTab.id);
            }
        }

        // Lưu phân quyền vào localStorage
        function savePermissions() {
            StorageUtil.saveJson(STORAGE_KEYS.permissions, permissions);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        // ========== Xuất PDF Functions ==========
        
        // Biến lưu trữ container và title cho việc xuất PDF
        let pdfPreviewContainer = null;
        let pdfPreviewTitle = '';
        
        // Hàm xuất nội dung tab ra PDF (hiển thị modal xem trước)
        function exportTabToPDF(tabId, title) {
            try {
                const tabContent = document.getElementById(tabId);
                if (!tabContent) {
                    alert('❌ Không tìm thấy nội dung tab!');
                    return;
                }
                
                // Hiển thị thông báo đang xử lý
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
                loadingMsg.textContent = '📄 Đang tạo file PDF...';
                document.body.appendChild(loadingMsg);
                
                // Đảm bảo tab được hiển thị trước khi clone
                const originalDisplay = tabContent.style.display;
                const originalClass = tabContent.className;
                tabContent.style.display = 'block';
                tabContent.classList.add('active');
                
                // Scroll đến đầu tab để đảm bảo capture từ đầu
                tabContent.scrollIntoView({ behavior: 'instant', block: 'start' });
                
                // Đợi một chút để đảm bảo render xong
                setTimeout(() => {
                    try {
                        // Tạo một bản sao sâu của nội dung để xuất PDF
                        const clone = tabContent.cloneNode(true);
                        
                        // Ẩn các phần không cần thiết trong bản sao (nhưng giữ lại giá trị hiển thị)
                        clone.querySelectorAll('.add-doctor-form, .export-pdf-btn, .password-toggle').forEach(el => {
                            el.style.display = 'none';
                        });
                        
                        // Ẩn các nút thao tác
                        clone.querySelectorAll('.delete-btn, .edit-btn, .add-btn, button').forEach(el => {
                            el.style.display = 'none';
                        });
                        
                        // Chuyển đổi input, select, textarea thành text hiển thị (giữ lại giá trị)
                        clone.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
                            const span = document.createElement('span');
                            span.textContent = input.value || '';
                            span.style.display = 'inline-block';
                            span.style.padding = '4px 8px';
                            span.style.minHeight = '20px';
                            input.parentNode.replaceChild(span, input);
                        });
                        
                        clone.querySelectorAll('select').forEach(select => {
                            const span = document.createElement('span');
                            const selectedOption = select.options[select.selectedIndex];
                            span.textContent = selectedOption ? selectedOption.text : '';
                            span.style.display = 'inline-block';
                            span.style.padding = '4px 8px';
                            span.style.minHeight = '20px';
                            select.parentNode.replaceChild(span, select);
                        });
                        
                        clone.querySelectorAll('textarea').forEach(textarea => {
                            const div = document.createElement('div');
                            div.textContent = textarea.value || '';
                            div.style.display = 'block';
                            div.style.padding = '4px 8px';
                            div.style.minHeight = '20px';
                            div.style.whiteSpace = 'pre-wrap';
                            textarea.parentNode.replaceChild(div, textarea);
                        });
                        
                        // Đảm bảo tất cả các bảng và nội dung được hiển thị đầy đủ
                        clone.querySelectorAll('table, .doctor-list, .doctor-item, .submission-item').forEach(el => {
                            el.style.display = 'block';
                            el.style.visibility = 'visible';
                            el.style.opacity = '1';
                        });
                        
                        // Đảm bảo tất cả các ô trong bảng hiển thị đầy đủ
                        clone.querySelectorAll('td, th').forEach(cell => {
                            cell.style.display = 'table-cell';
                            cell.style.visibility = 'visible';
                            cell.style.opacity = '1';
                        });
                        
                        // Đảm bảo overflow không bị ẩn
                        clone.querySelectorAll('[style*="overflow"]').forEach(el => {
                            el.style.overflow = 'visible';
                            el.style.overflowX = 'visible';
                            el.style.overflowY = 'visible';
                        });
                        
                        // Tạo container tạm thời để chứa nội dung xuất PDF
                        const printContainer = document.createElement('div');
                        printContainer.style.position = 'absolute';
                        printContainer.style.left = '-9999px';
                        printContainer.style.top = '0';
                        printContainer.style.width = '210mm'; // A4 width
                        printContainer.style.padding = '20mm';
                        printContainer.style.background = 'white';
                        printContainer.style.fontFamily = 'Arial, sans-serif';
                        printContainer.style.overflow = 'visible';
                        
                        // Thêm tiêu đề
                        const header = document.createElement('div');
                        header.style.marginBottom = '20px';
                        header.style.borderBottom = '2px solid #667eea';
                        header.style.paddingBottom = '10px';
                        header.innerHTML = `
                            <h1 style="color: #667eea; margin: 0; font-size: 24px;">${title}</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">Ngày xuất: ${new Date().toLocaleDateString('vi-VN', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</p>
                        `;
                        printContainer.appendChild(header);
                        
                        // Thêm nội dung với style đảm bảo hiển thị đầy đủ
                        const contentWrapper = document.createElement('div');
                        contentWrapper.style.width = '100%';
                        contentWrapper.style.overflow = 'visible';
                        contentWrapper.appendChild(clone);
                        printContainer.appendChild(contentWrapper);
                        
                        // Đảm bảo clone có style đầy đủ
                        clone.style.width = '100%';
                        clone.style.display = 'block';
                        clone.style.visibility = 'visible';
                        clone.style.opacity = '1';
                        clone.style.overflow = 'visible';
                        
                        // Đảm bảo tất cả các bảng có border và hiển thị đầy đủ
                        clone.querySelectorAll('table').forEach(table => {
                            table.style.borderCollapse = 'collapse';
                            table.style.width = '100%';
                            table.style.display = 'table';
                            table.style.visibility = 'visible';
                            table.style.opacity = '1';
                            // Đảm bảo tất cả các ô có border
                            table.querySelectorAll('td, th').forEach(cell => {
                                cell.style.border = '1px solid #ddd';
                                cell.style.padding = '8px';
                                cell.style.display = 'table-cell';
                            });
                        });
                        
                        // Lưu container và title để dùng khi lưu PDF
                        pdfPreviewContainer = printContainer;
                        pdfPreviewTitle = title;
                        
                        // Hiển thị modal xem trước
                        const previewContent = document.getElementById('pdfPreviewContent');
                        const previewTitle = document.getElementById('pdfPreviewTitle');
                        if (previewContent && previewTitle) {
                            // Xóa nội dung cũ
                            previewContent.innerHTML = '';
                            
                            // Tạo container cho preview (hiển thị trực tiếp, không ẩn)
                            const previewWrapper = document.createElement('div');
                            previewWrapper.style.width = '100%';
                            previewWrapper.style.background = 'white';
                            previewWrapper.style.padding = '20px';
                            previewWrapper.style.borderRadius = '8px';
                            previewWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                            
                            // Clone printContainer để hiển thị trong modal
                            const previewClone = printContainer.cloneNode(true);
                            previewClone.style.position = 'relative';
                            previewClone.style.left = '0';
                            previewClone.style.top = '0';
                            previewClone.style.width = '100%';
                            previewClone.style.maxWidth = '100%';
                            
                            previewWrapper.appendChild(previewClone);
                            previewContent.appendChild(previewWrapper);
                            
                            // Cập nhật tiêu đề
                            previewTitle.textContent = `Xem trước: ${title}`;
                            
                            // Hiển thị modal
                            document.getElementById('pdfPreviewModal').classList.add('active');
                            
                            // Khôi phục trạng thái ban đầu của tab
                                tabContent.style.display = originalDisplay;
                                tabContent.className = originalClass;
                                
                            // Xóa loading message
                                if (loadingMsg.parentNode) {
                                    document.body.removeChild(loadingMsg);
                                }
                        } else {
                            // Nếu không tìm thấy modal, xuất trực tiếp như cũ
                        document.body.appendChild(printContainer);
                            setTimeout(() => {
                                savePDFFromPreview();
                            }, 500);
                        }
                        
                    } catch (error) {
                        console.error('Lỗi khi chuẩn bị xuất PDF:', error);
                        tabContent.style.display = originalDisplay;
                        tabContent.className = originalClass;
                        if (loadingMsg.parentNode) {
                            document.body.removeChild(loadingMsg);
                        }
                        alert('❌ Lỗi khi xuất PDF: ' + error.message);
                    }
                }, 200);
                
            } catch (error) {
                console.error('Lỗi khi xuất PDF:', error);
                alert('❌ Lỗi khi xuất PDF: ' + error.message);
            }
        }
        
        // ========== Xuất PDF lịch nghỉ phép theo tháng ==========
        function openExportNghiPhepModal() {
            const modal = document.getElementById('exportNghiPhepModal');
            if (!modal) return;
            const today = new Date();
            const monthSelect = document.getElementById('exportNghiPhepMonth');
            const yearSelect = document.getElementById('exportNghiPhepYear');
            if (monthSelect) monthSelect.value = String(today.getMonth() + 1);
            if (yearSelect) {
                yearSelect.innerHTML = '';
                for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 2; y++) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = 'Năm ' + y;
                    if (y === today.getFullYear()) opt.selected = true;
                    yearSelect.appendChild(opt);
                }
            }
            modal.classList.add('active');
        }
        
        function closeExportNghiPhepModal() {
            const modal = document.getElementById('exportNghiPhepModal');
            if (modal) modal.classList.remove('active');
        }
        
        function doExportNghiPhepPDF() {
            const monthSelect = document.getElementById('exportNghiPhepMonth');
            const yearSelect = document.getElementById('exportNghiPhepYear');
            const month = parseInt(monthSelect?.value || 1, 10);
            const year = parseInt(yearSelect?.value || new Date().getFullYear(), 10);
            closeExportNghiPhepModal();
            exportNghiPhepToPDFByMonth(month, year);
        }
        
        // ========== Xuất PDF lịch trực theo tháng ==========
        function openExportLichTrucModal() {
            const modal = document.getElementById('exportLichTrucModal');
            if (!modal) return;
            const today = new Date();
            const monthSelect = document.getElementById('exportLichTrucMonth');
            const yearSelect = document.getElementById('exportLichTrucYear');
            if (monthSelect) monthSelect.value = String(today.getMonth() + 1);
            if (yearSelect) {
                yearSelect.innerHTML = '';
                for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 2; y++) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = 'Năm ' + y;
                    if (y === today.getFullYear()) opt.selected = true;
                    yearSelect.appendChild(opt);
                }
            }
            modal.classList.add('active');
        }
        
        function closeExportLichTrucModal() {
            const modal = document.getElementById('exportLichTrucModal');
            if (modal) modal.classList.remove('active');
        }
        
        function doExportLichTrucPDF() {
            const monthSelect = document.getElementById('exportLichTrucMonth');
            const yearSelect = document.getElementById('exportLichTrucYear');
            const month = parseInt(monthSelect?.value || 1, 10);
            const year = parseInt(yearSelect?.value || new Date().getFullYear(), 10);
            closeExportLichTrucModal();
            exportLichTrucToPDFByMonth(month, year);
        }
        
        function exportLichTrucToPDFByMonth(month, year) {
            try {
                const cycleStart = new Date(year, month - 2, 25);
                const cycleEnd = new Date(year, month - 1, 24);
                const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                let tableRows = '';
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const dayData = lichTrucData[key] || {};
                    const ldName = getLĐFromTructhuongtru(key);
                    const wd = date.getDay();
                    const isSaturday = wd === 6;
                    const c1 = dayData.c1 || {};
                    const c2 = dayData.c2 || {};
                    const c3 = dayData.c3 || {};
                    const c1Day = c1.day ? getDoctorNameByKey(c1.day, 'c1') : '-';
                    const c1Night = c1.night ? getDoctorNameByKey(c1.night, 'c1') : '-';
                    const c2Day = c2.day ? getDoctorNameByKey(c2.day, 'c2') : '-';
                    const c2Night = c2.night ? getDoctorNameByKey(c2.night, 'c2') : '-';
                    const c3Day = c3.day ? getDoctorNameByKey(c3.day, 'c3') : '-';
                    const c3Night = c3.night ? getDoctorNameByKey(c3.night, 'c3') : '-';
                    const t1630Key = dayData.truc1630 || dayData.c1?.truc1630 || dayData.c2?.truc1630 || dayData.c3?.truc1630 || '';
                    const t1630 = t1630Key ? getDoctorDisplayNameAnyColumn(t1630Key) : '-';
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    const holidayLabel = isHoliday && typeof getHolidayDisplayLabel === 'function' ? (getHolidayDisplayLabel(key).label || 'Nghỉ lễ') : '';
                    const dateStr = date.getDate() + '/' + (date.getMonth() + 1);
                    const weekday = weekdayNames[date.getDay()];
                    const rowStyle = isHoliday ? 'background:#d32f2f;color:#fff;' : '';
                    const cellStyle = isHoliday ? 'padding:8px;border:1px solid #b71c1c;font-weight:600;color:#fff;' : 'padding:8px;border:1px solid #ddd;font-weight:600;';
                    const cellStyleNorm = isHoliday ? 'padding:8px;border:1px solid #b71c1c;color:#fff;' : 'padding:8px;border:1px solid #ddd;';
                    tableRows += `<tr style="${rowStyle}"><td style="${cellStyle}">${dateStr}</td><td style="${cellStyleNorm}">${weekday}</td><td style="${cellStyleNorm}">${ldName}</td><td style="${cellStyleNorm}">${c1Day}</td><td style="${cellStyleNorm}">${c1Night}</td><td style="${cellStyleNorm}">${c2Day}</td><td style="${cellStyleNorm}">${c2Night}</td><td style="${cellStyleNorm}">${c3Day}</td><td style="${cellStyleNorm}">${c3Night}</td><td style="${cellStyleNorm}">${isSaturday ? t1630 : '-'}</td><td style="${cellStyleNorm}font-size:11px;">${holidayLabel}</td></tr>`;
                });
                const title = `Lịch trực tháng ${month}/${year}`;
                const html = `
                    <div style="font-family:Arial,sans-serif;padding:20px;background:#fff;">
                        <div style="margin-bottom:20px;border-bottom:2px solid #667eea;padding-bottom:10px;">
                            <h1 style="color:#667eea;margin:0;font-size:22px;">${title}</h1>
                            <p style="color:#666;margin:5px 0 0 0;font-size:12px;">Chu kỳ 25/${month === 1 ? 12 : month - 1}/${month === 1 ? year - 1 : year} - 24/${month}/${year} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                        </div>
                        <table style="width:100%;border-collapse:collapse;font-size:11px;">
                            <thead>
                                <tr style="background:#667eea;color:#fff;">
                                    <th style="padding:8px;border:1px solid #555;">Ngày</th>
                                    <th style="padding:8px;border:1px solid #555;">Thứ</th>
                                    <th style="padding:8px;border:1px solid #555;">LĐ</th>
                                    <th style="padding:8px;border:1px solid #555;">C1 Ngày</th>
                                    <th style="padding:8px;border:1px solid #555;">C1 Đêm</th>
                                    <th style="padding:8px;border:1px solid #555;">C2 Ngày</th>
                                    <th style="padding:8px;border:1px solid #555;">C2 Đêm</th>
                                    <th style="padding:8px;border:1px solid #555;">C3 Ngày</th>
                                    <th style="padding:8px;border:1px solid #555;">C3 Đêm</th>
                                    <th style="padding:8px;border:1px solid #555;">Bs 16h30</th>
                                    <th style="padding:8px;border:1px solid #555;">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>`;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.width = '210mm';
                tempDiv.style.background = 'white';
                document.body.appendChild(tempDiv);
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:8px;z-index:10001;';
                loadingMsg.textContent = '📄 Đang tạo file PDF...';
                document.body.appendChild(loadingMsg);
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Lich_truc_${month}_${year}_${new Date().toISOString().split('T')[0]}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };
                html2pdf().set(opt).from(tempDiv.firstElementChild).save().then(() => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('✅ Đã xuất PDF lịch trực tháng ' + month + '/' + year + ' thành công!');
                }).catch(err => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
                });
            } catch (err) {
                console.error('Lỗi exportLichTrucToPDFByMonth:', err);
                alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
            }
        }
        
        function exportNghiPhepToPDFByMonth(month, year) {
            try {
                // Chu kỳ: 25 tháng trước - 24 tháng hiện tại
                const cycleStart = new Date(year, month - 2, 25); // tháng -2 vì tháng 1 index 0, tháng trước = month-2
                const cycleEnd = new Date(year, month - 1, 24);
                const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) {
                    allDates.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
                
                const getColumnData = (dayData, col) => {
                    if (!dayData || !dayData[col]) return { doctors: [], maxCount: 0 };
                    const colData = dayData[col];
                    if (Array.isArray(colData)) return { doctors: colData, maxCount: 0 };
                    if (!Array.isArray(colData?.doctors)) return { doctors: [], maxCount: colData?.maxCount || 0 };
                    return { doctors: colData.doctors, maxCount: colData.maxCount || 0 };
                };
                
                const getDoctorNames = (doctorData, column) => {
                    if (!Array.isArray(doctorData)) return [];
                    return doctorData.map(item => {
                        if (!item || typeof item !== 'object' || !item.key) return null;
                        const name = getDoctorNameByKey(item.key, column);
                        if (!name) return null;
                        const period = item.period || 'full';
                        const periodLabel = period === 'morning' ? ' (Sáng)' : (period === 'afternoon' ? ' (Chiều)' : '');
                        return name + periodLabel;
                    }).filter(n => n);
                };
                
                const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                
                let tableRows = '';
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const rawData = quanlynghiphepData[key] || {};
                    const dayData = { ld: { doctors: [], maxCount: 0 }, c1: { doctors: [], maxCount: 0 }, c2: { doctors: [], maxCount: 0 }, c3: { doctors: [], maxCount: 0 } };
                    const fixedDateObj = new Date(key + 'T00:00:00');
                    const fixedWeekday = fixedDateObj.getDay();
                    const fixedWeekdayKey = fixedWeekday === 0 ? 7 : fixedWeekday;
                    
                    ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                        const savedCol = rawData[col];
                        const hasSavedData = savedCol && typeof savedCol === 'object' && Array.isArray(savedCol.doctors);
                        if (hasSavedData) {
                            dayData[col] = { doctors: [...(savedCol.doctors || [])], maxCount: savedCol.maxCount || 0 };
                        } else if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                            const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                            dayData[col] = { doctors: fixedDoctors.length > 0 ? fixedDoctors.map(fd => typeof fd === 'object' && fd.key ? fd : { key: fd, period: 'full' }) : [], maxCount: 0 };
                        }
                    });
                    
                    const ldData = getColumnData(dayData, 'ld');
                    const c1Data = getColumnData(dayData, 'c1');
                    const c2Data = getColumnData(dayData, 'c2');
                    const c3Data = getColumnData(dayData, 'c3');
                    
                    const ldNames = getDoctorNames(ldData.doctors, 'ld').join(', ') || '-';
                    const c1Names = getDoctorNames(c1Data.doctors, 'c1').join(', ') || '-';
                    const c2Names = getDoctorNames(c2Data.doctors, 'c2').join(', ') || '-';
                    const c3Names = getDoctorNames(c3Data.doctors, 'c3').join(', ') || '-';
                    
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    const holidayLabel = isHoliday && typeof getHolidayDisplayLabel === 'function' ? (getHolidayDisplayLabel(key).label || 'Nghỉ lễ') : '';
                    const dateStr = date.getDate() + '/' + (date.getMonth() + 1);
                    const weekday = weekdayNames[date.getDay()];
                    const rowStyle = isHoliday ? 'background:#d32f2f;color:#fff;' : '';
                    const cellStyle = isHoliday ? 'padding:8px;border:1px solid #b71c1c;font-weight:600;color:#fff;' : 'padding:8px;border:1px solid #ddd;font-weight:600;';
                    const cellStyleNorm = isHoliday ? 'padding:8px;border:1px solid #b71c1c;color:#fff;' : 'padding:8px;border:1px solid #ddd;';
                    tableRows += `<tr style="${rowStyle}"><td style="${cellStyle}">${dateStr}</td><td style="${cellStyleNorm}">${weekday}</td><td style="${cellStyleNorm}">${ldNames}</td><td style="${cellStyleNorm}">${c1Names}</td><td style="${cellStyleNorm}">${c2Names}</td><td style="${cellStyleNorm}">${c3Names}</td><td style="${cellStyleNorm}font-size:11px;">${holidayLabel}</td></tr>`;
                });
                
                const title = `Lịch nghỉ phép tháng ${month}/${year}`;
                const html = `
                    <div style="font-family:Arial,sans-serif;padding:20px;background:#fff;">
                        <div style="margin-bottom:20px;border-bottom:2px solid #667eea;padding-bottom:10px;">
                            <h1 style="color:#667eea;margin:0;font-size:22px;">${title}</h1>
                            <p style="color:#666;margin:5px 0 0 0;font-size:12px;">Chu kỳ 25/${month === 1 ? 12 : month - 1}/${month === 1 ? year - 1 : year} - 24/${month}/${year} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                        </div>
                        <table style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead>
                                <tr style="background:#667eea;color:#fff;">
                                    <th style="padding:10px;border:1px solid #555;text-align:left;">Ngày</th>
                                    <th style="padding:10px;border:1px solid #555;">Thứ</th>
                                    <th style="padding:10px;border:1px solid #555;">LĐ</th>
                                    <th style="padding:10px;border:1px solid #555;">C1</th>
                                    <th style="padding:10px;border:1px solid #555;">C2</th>
                                    <th style="padding:10px;border:1px solid #555;">C3</th>
                                    <th style="padding:10px;border:1px solid #555;">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>`;
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.width = '210mm';
                tempDiv.style.background = 'white';
                document.body.appendChild(tempDiv);
                
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:8px;z-index:10001;';
                loadingMsg.textContent = '📄 Đang tạo file PDF...';
                document.body.appendChild(loadingMsg);
                
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Lich_nghi_phep_${month}_${year}_${new Date().toISOString().split('T')[0]}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };
                
                html2pdf().set(opt).from(tempDiv.firstElementChild).save().then(() => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('✅ Đã xuất PDF lịch nghỉ phép tháng ' + month + '/' + year + ' thành công!');
                }).catch(err => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
                });
            } catch (err) {
                console.error('Lỗi exportNghiPhepToPDFByMonth:', err);
                alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
            }
        }
        
        // Đóng modal xem trước PDF
        function closePDFPreview() {
            const modal = document.getElementById('pdfPreviewModal');
            if (modal) {
                modal.classList.remove('active');
            }
            // Xóa container tạm thời nếu có
            if (pdfPreviewContainer && pdfPreviewContainer.parentNode) {
                document.body.removeChild(pdfPreviewContainer);
            }
            pdfPreviewContainer = null;
            pdfPreviewTitle = '';
        }
        
        // Lưu PDF từ modal xem trước
        function savePDFFromPreview() {
            if (!pdfPreviewContainer || !pdfPreviewTitle) {
                alert('❌ Không có dữ liệu để xuất PDF!');
                return;
            }
            
            // Đảm bảo container có style đúng và được thêm vào DOM
            pdfPreviewContainer.style.position = 'absolute';
            pdfPreviewContainer.style.left = '-9999px';
            pdfPreviewContainer.style.top = '0';
            pdfPreviewContainer.style.width = '210mm';
            pdfPreviewContainer.style.padding = '20mm';
            pdfPreviewContainer.style.background = 'white';
            pdfPreviewContainer.style.fontFamily = 'Arial, sans-serif';
            pdfPreviewContainer.style.overflow = 'visible';
            
            // Xóa container khỏi DOM cũ nếu có (từ preview)
            if (pdfPreviewContainer.parentNode) {
                pdfPreviewContainer.parentNode.removeChild(pdfPreviewContainer);
            }
            
            // Thêm container vào body với style ẩn
            document.body.appendChild(pdfPreviewContainer);
            
            // Hiển thị thông báo đang xử lý
            const loadingMsg = document.createElement('div');
            loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10001;';
            loadingMsg.textContent = '📄 Đang tạo file PDF...';
            document.body.appendChild(loadingMsg);
                        
                        // Đợi một chút để đảm bảo render xong
                        setTimeout(() => {
                try {
                            // Cấu hình xuất PDF với full page
                            const opt = {
                                margin: [10, 10, 10, 10],
                        filename: `${pdfPreviewTitle}_${new Date().toISOString().split('T')[0]}.pdf`,
                                image: { type: 'jpeg', quality: 0.98 },
                                html2canvas: { 
                                    scale: 2,
                                    useCORS: true,
                                    logging: false,
                                    scrollY: 0,
                                    scrollX: 0,
                            windowWidth: pdfPreviewContainer.scrollWidth || 210 * 3.779527559, // mm to px
                            windowHeight: pdfPreviewContainer.scrollHeight || 297 * 3.779527559, // mm to px
                                    allowTaint: true,
                                    backgroundColor: '#ffffff',
                                    removeContainer: false
                                },
                                jsPDF: { 
                                    unit: 'mm', 
                                    format: 'a4', 
                                    orientation: 'portrait',
                                    compress: true
                                },
                                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                            };
                            
                            // Xuất PDF
                    html2pdf().set(opt).from(pdfPreviewContainer).save().then(() => {
                                // Xóa container tạm thời
                        if (pdfPreviewContainer && pdfPreviewContainer.parentNode) {
                            document.body.removeChild(pdfPreviewContainer);
                                }
                                if (loadingMsg.parentNode) {
                                    document.body.removeChild(loadingMsg);
                                }
                        
                        // Đóng modal
                        closePDFPreview();
                        
                                alert('✅ Đã xuất PDF thành công!');
                            }).catch((error) => {
                                console.error('Lỗi khi xuất PDF:', error);
                                
                                // Xóa container tạm thời
                        if (pdfPreviewContainer && pdfPreviewContainer.parentNode) {
                            document.body.removeChild(pdfPreviewContainer);
                                }
                                if (loadingMsg.parentNode) {
                                    document.body.removeChild(loadingMsg);
                                }
                                alert('❌ Lỗi khi xuất PDF: ' + error.message);
                            });
                    } catch (error) {
                    console.error('Lỗi khi xuất PDF:', error);
                        if (loadingMsg.parentNode) {
                            document.body.removeChild(loadingMsg);
                        }
                        alert('❌ Lỗi khi xuất PDF: ' + error.message);
                    }
            }, 500);
        }
        
        // Tự động thêm nút xuất PDF cho tất cả các tab
        function addExportPDFButtons() {
            document.querySelectorAll('.tab-content[id]').forEach(tab => {
                const tabId = tab.id;
                // Bỏ qua các tab không cần xuất PDF
                if ([
                    'loginModal',
                    'permissionsModal',
                    'editDoctorModal',
                    'requestModal',
                    'adminReviewModal',
                    'hosobenhnhan', // Không tạo nút Xuất PDF cho tab Hồ Sơ Bệnh Án
                ].includes(tabId)) {
                    return;
                }
                
                const formContainer = tab.querySelector('.form-container');
                if (!formContainer) return;
                
                    // Lấy tên tab từ nút tab tương ứng
                    const tabButton = document.querySelector(`.tabs .tab[data-tab="${CSS.escape(tabId)}"]`);
                    let tabTitle = tabId;
                    if (tabButton) {
                        tabTitle = tabButton.textContent.trim() || tabId;
                    }
                
                // Thêm nút Xuất PDF cho tab Lịch Trực (xuất theo tháng)
                if (tabId === 'lichtruc') {
                    let buttonsContainer = formContainer.querySelector('.buttons-container');
                    if (!buttonsContainer) {
                        buttonsContainer = document.createElement('div');
                        buttonsContainer.className = 'buttons-container';
                        const exportBtn = document.createElement('button');
                        exportBtn.className = 'export-pdf-btn';
                        exportBtn.innerHTML = '📄 Xuất PDF';
                        exportBtn.onclick = () => openExportLichTrucModal();
                        buttonsContainer.appendChild(exportBtn);
                        formContainer.insertBefore(buttonsContainer, formContainer.firstChild);
                    }
                } else if (tabId === 'quanlynghiphep') {
                    // Kiểm tra xem đã có container chưa
                    let buttonsContainer = formContainer.querySelector('.buttons-container');
                    if (!buttonsContainer) {
                        // Tạo container cho các nút
                        buttonsContainer = document.createElement('div');
                        buttonsContainer.className = 'buttons-container';
                        
                        const leaveRequestListBtn = document.createElement('button');
                        leaveRequestListBtn.className = 'export-pdf-btn';
                        leaveRequestListBtn.id = 'leaveRequestListBtn';
                        leaveRequestListBtn.style.position = 'relative';
                        leaveRequestListBtn.innerHTML = '📋 Danh sách duyệt nghỉ phép';
                        leaveRequestListBtn.onclick = () => openLeaveRequestListModal();
                        buttonsContainer.appendChild(leaveRequestListBtn);
                        
                        // Thêm badge ban đầu
                        updateLeaveRequestListBadge();
                        
                        const holidayCalendarBtn = document.createElement('button');
                        holidayCalendarBtn.className = 'export-pdf-btn';
                        holidayCalendarBtn.innerHTML = '🏮 Lịch nghỉ lễ';
                        holidayCalendarBtn.onclick = () => openHolidayCalendarModal();
                        buttonsContainer.appendChild(holidayCalendarBtn);
                        
                        const fixedScheduleBtn = document.createElement('button');
                        fixedScheduleBtn.className = 'export-pdf-btn';
                        fixedScheduleBtn.innerHTML = '📅 Lịch nghỉ cố định';
                        fixedScheduleBtn.onclick = () => openFixedScheduleModal();
                        buttonsContainer.appendChild(fixedScheduleBtn);
                        
                        const maxCountBtn = document.createElement('button');
                        maxCountBtn.className = 'export-pdf-btn';
                        maxCountBtn.innerHTML = '📊 Số lượng bác sĩ được nghỉ phép';
                        maxCountBtn.onclick = () => openMaxCountModal();
                        buttonsContainer.appendChild(maxCountBtn);
                    
                    const exportBtn = document.createElement('button');
                    exportBtn.className = 'export-pdf-btn';
                    exportBtn.innerHTML = '📄 Xuất PDF';
                    exportBtn.onclick = () => openExportNghiPhepModal();
                        buttonsContainer.appendChild(exportBtn);
                        
                        formContainer.insertBefore(buttonsContainer, formContainer.firstChild);
                    }
                } else {
                    // Các tab khác chỉ có nút Xuất PDF (chỉ tạo nếu chưa có)
                    const existingBtn = formContainer.querySelector('.export-pdf-btn');
                    const existingContainer = formContainer.querySelector('.buttons-container');
                    if (!existingBtn && !existingContainer) {
                        const exportBtn = document.createElement('button');
                        exportBtn.className = 'export-pdf-btn';
                        exportBtn.innerHTML = '📄 Xuất PDF';
                        exportBtn.onclick = () => exportTabToPDF(tabId, tabTitle);
                        // Đảm bảo formContainer có position relative để nút absolute hoạt động
                        if (window.getComputedStyle(formContainer).position === 'static') {
                            formContainer.style.position = 'relative';
                        }
                    formContainer.insertBefore(exportBtn, formContainer.firstChild);
                    }
                }
            });
        }
        
        // Khởi tạo nút xuất PDF khi DOM sẵn sàng
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(addExportPDFButtons, 500);
            });
        } else {
            setTimeout(addExportPDFButtons, 500);
        }

        // Chuyển đổi tab
        function switchTab(tabName, buttonElement) {
            // Ẩn tất cả tab content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Đảm bảo nút xuất PDF được thêm vào tab mới
            setTimeout(addExportPDFButtons, 100);
            
            // Ẩn tất cả tab buttons
            document.querySelectorAll('.tab').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Hiển thị tab được chọn
            const tabContent = document.getElementById(tabName);
            if (tabContent) {
                tabContent.classList.add('active');
                // Tự động scroll đến nội dung tab với offset để không bị header che
                setTimeout(() => {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const tabsHeight = document.querySelector('.tabs')?.offsetHeight || 0;
                    const offset = headerHeight + tabsHeight + 20;
                    const elementPosition = tabContent.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }, 100);
            }
            if (buttonElement) {
                buttonElement.classList.add('active');
            }
            
            // Nếu là tab danh sách bác sĩ, hiển thị lại danh sách
            if (['cot1', 'cot2', 'cot3', 'partime', 'khac'].includes(tabName)) {
                displayDoctors(tabName);
            } else if (tabName === 'trangchu' || tabName === '') {
                if (typeof renderTrangChuLanhDaoList === 'function') renderTrangChuLanhDaoList();
                if (tabName === '' && document.getElementById('trangchu')) {
                    document.getElementById('trangchu').classList.add('active');
                }
            } else if (tabName === 'lanhdao') {
                displayDoctors('lanhdao');
            } else if (tabName === 'nghiphep') {
                // Render calendar cho tab Đăng ký nghỉ phép (hiển thị giống admin nhưng vẫn có tính năng xin nghỉ phép)
                if (typeof renderNghiPhepCalendars === 'function') {
                    renderNghiPhepCalendars();
                }
            } else if (tabName === 'quanlynghiphep') {
                renderAdminCalendars();
                var pendingDate = sessionStorage.getItem('pendingLeaveReviewDate');
                if (pendingDate) {
                    sessionStorage.removeItem('pendingLeaveReviewDate');
                    var parts = (pendingDate || '').split('-').map(Number);
                    var d = parts.length >= 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(pendingDate);
                    setTimeout(function () {
                        var cal = document.getElementById('adminCalendarContainer');
                        if (cal) cal.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (typeof onAdminDateClick === 'function') onAdminDateClick(d);
                    }, 400);
                }
            } else if (tabName === 'lichnghiphep') {
                initLichNghiPhepTab();
            } else if (tabName === 'lichtruc') {
                if (typeof renderLichTrucCalendars === 'function') renderLichTrucCalendars();
            } else if (tabName === 'ngaycong') {
                initNgayCongTab();
            } else if (tabName === 'quanlytaikhoan') {
                // Nếu bật backend: tải lại dữ liệu từ server để admin thấy yêu cầu reset mật khẩu từ bác sĩ (máy khác)
                function showQuanlytaikhoan() {
                    displayAccounts();
                    displayPasswordRequests();
                    setTimeout(function () { if (typeof renderDebugInfo === 'function') renderDebugInfo(); }, 100);
                }
                if (USE_DATABASE_BACKEND && typeof loadFromServerIfEnabled === 'function') {
                    loadFromServerIfEnabled().then(showQuanlytaikhoan);
                } else {
                    showQuanlytaikhoan();
                }
            } else if (tabName === 'cvcot1') {
                initcvcot1Table();
            } else if (tabName === 'cvcot23') {
                initcvcot23Table();
            } else if (tabName === 'khamhotropk') {
                initKhamHoTroPKTable();
            } else if (tabName === 'khamsomTruaLB') {
                initKhamSomTruaLBCalendar();
            } else if (tabName === 'khamcaugiay') {
                initKhamCauGiayCalendar();
            } else if (tabName === 'khamcaugiay20h') {
                initKhamCauGiay20hCalendar();
            } else if (tabName === 'khamlongbien') {
                initKhamLongBienCalendar();
            } else if (tabName === 'khamsanSieuamVip') {
                initKhamSanSieuamVipCalendar();
            } else if (tabName === 'tieuphau') {
                inittieuphauCalendar();
            } else if (tabName === 'livetream') {
                initLivetreamTable();
            } else if (tabName === 'tang4') {
                initTang4Table();
            } else if (tabName === 'hoichancot1') {
                initHoichancot1Schedule();
            } else if (tabName === 'phumo') {
                initPhumoTable();
            } else if (tabName === 'tructhuongtru') {
                initTructhuongtruTable();
            } else if (tabName === 'lamviechangngay') {
                initLamviechangngayTable();
            } else if (tabName === 'lichlamviec') {
                initLichlamviecTable();
            }
            
            // Cập nhật trạng thái các nút thêm dòng dựa trên quyền
            updateAddButtonsVisibility();
            
            // Nếu là bác sĩ, disable lại các nút chỉnh sửa sau khi render và cập nhật thông báo quyền đầu tab
            if (currentUser && currentUser.role === 'doctor') {
                setTimeout(function () {
                    disableEditForDoctor();
                    updatePermissionNoticeForTab(tabName);
                }, 200);
            }
        }

        // Cập nhật trạng thái hiển thị các nút "Thêm dòng mới" dựa trên quyền
        function updateAddButtonsVisibility() {
            const tabButtons = [
                { tab: 'cvcot1', func: 'addcvcot1Row' },
                { tab: 'cvcot23', func: 'addcvcot23Row' },
                { tab: 'khamhotropk', func: 'addKhamHoTroPKRow' },
                { tab: 'phumo', func: 'addPhumoRow' },
                { tab: 'livetream', func: 'addLivetreamRow' },
                { tab: 'tang4', func: 'addTang4Row' }
            ];
            
            tabButtons.forEach(({ tab, func }) => {
                const addBtn = document.querySelector(`#${tab} button[onclick*="${func}"]`);
                if (addBtn) {
                    if (hasPermission(tab)) {
                        addBtn.style.display = 'block';
                    } else {
                        addBtn.style.display = 'none';
                    }
                }
            });
        }

        // So sánh trùng thông tin bác sĩ (họ tên, tên hiển thị, SĐT) — bỏ qua hoa thường, trim
        function isSameDoctorInfo(doc, info) {
            const n1 = (doc && (doc.name || '')).trim().toLowerCase();
            const n2 = (info && (info.name || '')).trim().toLowerCase();
            const d1 = (doc && (doc.displayName || doc.name || '')).trim().toLowerCase();
            const d2 = (info && (info.displayName || info.name || '')).trim().toLowerCase();
            const p1 = (doc && (doc.phone || '')).trim();
            const p2 = (info && (info.phone || '')).trim();
            return n1 === n2 && d1 === d2 && p1 === p2;
        }

        // Kiểm tra trùng (tên hiển thị + SĐT) trong toàn bộ nhóm bác sĩ; excludeType + excludeId để bỏ qua 1 bác sĩ khi sửa
        function hasDuplicateDisplayNameAndPhoneAcrossGroups(displayName, phone, excludeType, excludeId) {
            const d = (displayName || '').trim().toLowerCase();
            const p = (phone || '').trim();
            const types = ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'];
            for (let t = 0; t < types.length; t++) {
                const list = doctors[types[t]] || [];
                for (let i = 0; i < list.length; i++) {
                    const doc = list[i];
                    if (excludeType === types[t] && excludeId !== undefined && doc.id === excludeId) continue;
                    const d1 = (doc.displayName || doc.name || '').trim().toLowerCase();
                    const p1 = (doc.phone || '').trim();
                    if (d1 === d && p1 === p) return true;
                }
            }
            return false;
        }

        // Suffix ID form trong HTML: cot1/cot2/cot3 giữ nguyên, còn lại viết hoa chữ đầu (Lanhdao, Partime, Khac)
        function getDoctorFormIdSuffix(type) {
            if (type === 'cot1' || type === 'cot2' || type === 'cot3') return type;
            return type.charAt(0).toUpperCase() + type.slice(1);
        }

        // Thêm bác sĩ (lưu localStorage + đồng bộ database)
        function addDoctor(event, type) {
            event.preventDefault();
            
            if (!hasPermission(type)) {
                alert('Bạn không có quyền thêm bác sĩ ở tab này. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            const suffix = getDoctorFormIdSuffix(type);
            const nameInput = document.getElementById(`doctorName${suffix}`);
            const displayNameInput = document.getElementById(`doctorDisplayName${suffix}`);
            const phoneInput = document.getElementById(`doctorPhone${suffix}`);
            
            if (!nameInput || !displayNameInput) {
                alert('Không tìm thấy form nhập liệu. Vui lòng tải lại trang.');
                return;
            }
            const name = nameInput.value.trim();
            const displayName = displayNameInput.value.trim();
            const phone = (phoneInput && phoneInput.value) ? phoneInput.value.trim() : '';
            
            if (!name || !displayName) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc (Họ và Tên, Tên Hiển Thị)!');
                return;
            }

            const list = doctors[type] || [];
            if (list.some(function (d) { return isSameDoctorInfo(d, { name: name, displayName: displayName, phone: phone }); })) {
                alert('⚠️ Đã tồn tại bác sĩ trùng Họ tên, Tên hiển thị và Số điện thoại trong danh sách này. Vui lòng nhập lại thông tin khác.');
                return;
            }
            if (hasDuplicateDisplayNameAndPhoneAcrossGroups(displayName, phone)) {
                alert('⚠️ Đã có bác sĩ ở nhóm khác trùng Tên hiển thị và Số điện thoại. Hai bác sĩ khác nhóm không được trùng cặp này. Vui lòng nhập lại.');
                return;
            }

            if (!Array.isArray(doctors[type])) doctors[type] = [];
            const maxId = doctors[type].length ? Math.max(...doctors[type].map(d => d.id || 0)) : 0;
            const newDoctor = {
                id: maxId + 1,
                name: name,
                displayName: displayName,
                phone: phone || ''
            };
            doctors[type].push(newDoctor);
            saveDoctorsGroupToStorage(type);

            nameInput.value = '';
            if (displayNameInput) displayNameInput.value = '';
            if (phoneInput) phoneInput.value = '';

            displayDoctors(type);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // Xóa bác sĩ (lưu localStorage + đồng bộ database)
        function deleteDoctor(type, id) {
            if (!hasPermission(type)) {
                alert('Bạn không có quyền xóa bác sĩ ở tab này. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (!confirm('Bạn có chắc chắn muốn xóa bác sĩ này?')) return;

            doctors[type] = (doctors[type] || []).filter(d => d.id !== id);
            saveDoctorsGroupToStorage(type);
            displayDoctors(type);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // Đảm bảo modal sửa bác sĩ có trong DOM (trang con như cot1.html không có sẵn modal)
        function ensureEditDoctorModalInDom() {
            if (document.getElementById('editDoctorModal')) return;
            const html = `
                <div id="editDoctorModal" class="login-modal">
                    <div class="login-box">
                        <h2>✏️ Sửa Thông Tin Bác Sĩ</h2>
                        <div id="editDoctorError" class="error-message" style="display: none;"></div>
                        <div id="editDoctorSuccess" class="success-message" style="display: none;"></div>
                        <form id="editDoctorForm" onsubmit="saveEditDoctor(event)">
                            <input type="hidden" id="editDoctorType">
                            <input type="hidden" id="editDoctorId">
                            <div class="form-group">
                                <label for="editDoctorName">Họ và Tên <span class="required">*</span></label>
                                <input type="text" id="editDoctorName" required>
                            </div>
                            <div class="form-group">
                                <label for="editDoctorDisplayName">Tên Hiển Thị <span class="required">*</span></label>
                                <input type="text" id="editDoctorDisplayName" required>
                            </div>
                            <div class="form-group">
                                <label for="editDoctorPhone">Số Điện Thoại</label>
                                <input type="tel" id="editDoctorPhone">
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button type="button" class="submit-btn" onclick="closeEditDoctor()" style="background:#95a5a6; flex:1;">Hủy</button>
                                <button type="submit" class="submit-btn" style="flex:1;">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>`;
            const wrap = document.createElement('div');
            wrap.innerHTML = html.trim();
            document.body.appendChild(wrap.firstChild);
        }

        // Mở modal sửa bác sĩ
        function openEditDoctor(type, id) {
            const doctor = (doctors[type] || []).find(d => d.id === id);
            if (!doctor) return;
            ensureEditDoctorModalInDom();
            const modal = document.getElementById('editDoctorModal');
            const typeInput = document.getElementById('editDoctorType');
            const idInput = document.getElementById('editDoctorId');
            const nameInput = document.getElementById('editDoctorName');
            const displayInput = document.getElementById('editDoctorDisplayName');
            const phoneInput = document.getElementById('editDoctorPhone');
            const errEl = document.getElementById('editDoctorError');
            const okEl = document.getElementById('editDoctorSuccess');
            if (!modal || !typeInput || !idInput || !nameInput || !displayInput) return;
            typeInput.value = type;
            idInput.value = id;
            nameInput.value = doctor.name || '';
            displayInput.value = doctor.displayName || doctor.name || '';
            if (phoneInput) phoneInput.value = doctor.phone || '';
            if (errEl) errEl.style.display = 'none';
            if (okEl) okEl.style.display = 'none';
            modal.classList.add('active');
        }

        // Đóng modal sửa bác sĩ
        function closeEditDoctor() {
            const modal = document.getElementById('editDoctorModal');
            if (modal) modal.classList.remove('active');
        }

        // Lưu thay đổi bác sĩ
        async function saveEditDoctor(event) {
            event.preventDefault();
            const type = document.getElementById('editDoctorType').value;
            
            // Kiểm tra quyền
            if (!hasPermission(type)) {
                alert('Bạn không có quyền sửa bác sĩ ở tab này. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            const id = Number(document.getElementById('editDoctorId').value);
            const name = document.getElementById('editDoctorName').value.trim();
            const displayName = document.getElementById('editDoctorDisplayName').value.trim();
            const phone = document.getElementById('editDoctorPhone').value.trim();
            const errorEl = document.getElementById('editDoctorError');
            const successEl = document.getElementById('editDoctorSuccess');

            errorEl.style.display = 'none';
            successEl.style.display = 'none';

            if (!name || !displayName) {
                errorEl.textContent = '❌ Vui lòng điền đầy đủ thông tin bắt buộc (Họ và Tên, Tên Hiển Thị)!';
                errorEl.style.display = 'block';
                return;
            }

            const list = doctors[type] || [];
            const isDuplicateSameGroup = list.some(function (d) {
                return d.id !== id && isSameDoctorInfo(d, { name: name, displayName: displayName, phone: phone });
            });
            if (isDuplicateSameGroup) {
                errorEl.textContent = '⚠️ Đã tồn tại bác sĩ khác trùng Họ tên, Tên hiển thị và Số điện thoại. Vui lòng nhập lại thông tin khác.';
                errorEl.style.display = 'block';
                return;
            }
            if (hasDuplicateDisplayNameAndPhoneAcrossGroups(displayName, phone, type, id)) {
                errorEl.textContent = '⚠️ Đã có bác sĩ ở nhóm khác trùng Tên hiển thị và Số điện thoại. Hai bác sĩ khác nhóm không được trùng cặp này. Vui lòng nhập lại.';
                errorEl.style.display = 'block';
                return;
            }

            const idx = list.findIndex(d => d.id === id);
            if (idx === -1) {
                errorEl.textContent = '❌ Không tìm thấy bác sĩ.';
                errorEl.style.display = 'block';
                return;
            }

            const oldName = doctors[type][idx].name;
            const oldKey = normalizeKey(oldName);
            const newKey = normalizeKey(name);

            // Nếu sẽ đổi tên và có tài khoản cũ, không cho phép đổi nếu key mới đã tồn tại cho tài khoản khác
            if (oldName !== name && accounts[oldKey] && accounts[newKey] && oldKey !== newKey) {
                errorEl.textContent = '❌ Tên đăng nhập mới đã tồn tại. Vui lòng chọn tên khác.';
                errorEl.style.display = 'block';
                return;
            }

            doctors[type][idx].name = name;
            doctors[type][idx].displayName = displayName;
            doctors[type][idx].phone = phone;

            if (oldName !== name && accounts[oldKey]) {
                const acc = accounts[oldKey];
                delete accounts[oldKey];
                acc.username = name;
                acc.name = name;
                accounts[newKey] = acc;
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }

            saveDoctorsGroupToStorage(type);
            displayDoctors(type);
            displayAccounts();
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();

            successEl.textContent = '✅ Cập nhật thông tin thành công!';
            successEl.style.display = 'block';
            setTimeout(() => closeEditDoctor(), 800);
        }

        // Hiển thị danh sách bác sĩ (dữ liệu từ bộ nhớ / localStorage / database đã load)
        function displayDoctors(type) {
            const suffix = getDoctorFormIdSuffix(type);
            const container = document.getElementById(`doctorList${suffix}`);
            if (!container) return;

            const doctorList = doctors[type] || [];

            if (doctorList.length === 0) {
                container.innerHTML = '<div class="empty-state">Chưa có bác sĩ nào</div>';
                return;
            }
            
            const hasEditPermission = hasPermission(type);
            container.innerHTML = doctorList.map(doctor => {
                const accKey = normalizeKey(doctor.name);
                const account = accounts[accKey];
                const usernameDisplay = account ? account.username : doctor.name;
                const editDeleteButtons = hasEditPermission ? `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="edit-btn" onclick="openEditDoctor('${type}', ${doctor.id})">✏️ Sửa</button>
                        <button class="delete-btn" onclick="deleteDoctor('${type}', ${doctor.id})">🗑️ Xóa</button>
                    </div>
                ` : '';
                return `
                <div class="doctor-item">
                    <div class="doctor-info">
                        <strong>${doctor.name}</strong>
                        <span>👤 Tài khoản: ${usernameDisplay}</span>
                        <span>🏷️ Tên hiển thị: ${doctor.displayName || doctor.name}</span>
                        <span>📞 ${doctor.phone || 'Chưa có'}</span>
                    </div>
                    ${editDeleteButtons}
                </div>
                `;
            }).join('');

            // Đồng bộ danh sách lãnh đạo lên block Trang chủ (chỉ xem, không nút Sửa/Xóa)
            if (type === 'lanhdao') {
                renderTrangChuLanhDaoList();
            }
        }

        // Hiển thị danh sách lãnh đạo trên Trang chủ (block #trangchuLanhdaoList)
        function renderTrangChuLanhDaoList() {
            const container = document.getElementById('trangchuLanhdaoList');
            if (!container) return;
            const doctorList = doctors.lanhdao || [];
            if (doctorList.length === 0) {
                container.innerHTML = '<div class="empty-state">Chưa có lãnh đạo nào</div>';
                return;
            }
            container.innerHTML = doctorList.map(doctor => {
                const accKey = normalizeKey(doctor.name);
                const account = accounts[accKey];
                const usernameDisplay = account ? account.username : doctor.name;
                return `
                <div class="doctor-item">
                    <div class="doctor-info">
                        <strong>${(doctor.name || '').replace(/</g, '&lt;')}</strong>
                        <span>👤 Tài khoản: ${(usernameDisplay || '').replace(/</g, '&lt;')}</span>
                        <span>🏷️ Tên hiển thị: ${(doctor.displayName || doctor.name || '').replace(/</g, '&lt;')}</span>
                        <span>📞 ${(doctor.phone || 'Chưa có').replace(/</g, '&lt;')}</span>
                    </div>
                </div>
                `;
            }).join('');
        }

        // Hiển thị danh sách đăng ký
        function displaySubmissions() {
            // Now managed via calendar; legacy display removed
            const container = document.getElementById('submissionsContainer');
            if (container) {
                container.innerHTML = '<div class="empty-state">Danh sách được quản lý qua lịch</div>';
            }
        }

        // Chuyển đổi mã khoa thành tên
        function getDepartmentName(code) {
            const departments = {
                'khoa-noi': 'Khoa Nội',
                'khoa-ngoai': 'Khoa Ngoại',
                'khoa-san': 'Khoa Sản',
                'khoa-nhi': 'Khoa Nhi',
                'khoa-cap-cuu': 'Khoa Cấp Cứu',
                'khoa-tim-mach': 'Khoa Tim Mạch',
                'khoa-than-kinh': 'Khoa Thần Kinh',
                'khoa-mat': 'Khoa Mắt',
                'khoa-tai-mui-hong': 'Khoa Tai Mũi Họng',
                'khoa-da-lieu': 'Khoa Da Liễu',
                'phong-kham': 'Phòng Khám',
                'khac': 'Khác'
            };
            return departments[code] || code;
        }

        // Chuyển đổi mã loại nghỉ thành tên
        function getLeaveTypeName(code) {
            const types = {
                'nghi-phep-nam': 'Nghỉ Phép Năm',
                'nghi-om': 'Nghỉ Ốm',
                'nghi-co-viec': 'Nghỉ Có Việc Riêng',
                'nghi-thai-san': 'Nghỉ Thai Sản',
                'nghi-khong-luong': 'Nghỉ Không Lương',
                'khac': 'Khác'
            };
            return types[code] || code;
        }

        // Xử lý submit form đăng ký nghỉ phép
        function initLeaveForm() {
            const leaveForm = document.getElementById('leaveForm');
            if (leaveForm) {
                leaveForm.addEventListener('submit', function(e) {
                    e.preventDefault();

                    // Ẩn thông báo cũ
                    const successMsg = document.getElementById('successMessage');
                    const errorMsg = document.getElementById('errorMessage');
                    if (successMsg) successMsg.style.display = 'none';
                    if (errorMsg) errorMsg.style.display = 'none';

                    // Lấy dữ liệu form
                    const formData = {
                        doctorName: document.getElementById('doctorName')?.value.trim() || '',
                        department: document.getElementById('department')?.value || '',
                        leaveType: document.getElementById('leaveType')?.value || '',
                        startDate: document.getElementById('startDate')?.value || '',
                        endDate: document.getElementById('endDate')?.value || '',
                        reason: document.getElementById('reason')?.value.trim() || '',
                        contactPhone: document.getElementById('contactPhone')?.value.trim() || '',
                        notes: document.getElementById('notes')?.value.trim() || '',
                        submitDate: new Date().toISOString()
                    };

                    // Kiểm tra dữ liệu
                    if (!formData.doctorName || !formData.department || !formData.leaveType || 
                        !formData.startDate || !formData.endDate || !formData.reason || !formData.contactPhone) {
                        if (errorMsg) {
                            errorMsg.textContent = '❌ Vui lòng điền đầy đủ thông tin bắt buộc.';
                            errorMsg.style.display = 'block';
                        }
                        return;
                    }

                    // Kiểm tra ngày hợp lệ
                    if (new Date(formData.startDate) > new Date(formData.endDate)) {
                        if (errorMsg) {
                            errorMsg.textContent = '❌ Ngày bắt đầu phải trước ngày kết thúc!';
                            errorMsg.style.display = 'block';
                        }
                        return;
                    }

                    // Thêm vào danh sách
                    submissions.unshift(formData);
                    StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                    if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();

                    // Hiển thị thông báo thành công
                    if (successMsg) successMsg.style.display = 'block';

                    // Reset form
                    this.reset();

                    // Cập nhật danh sách
                    displaySubmissions();

                    // Cuộn lên đầu trang
                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    // Ẩn thông báo sau 5 giây
                    setTimeout(() => {
                        if (successMsg) successMsg.style.display = 'none';
                    }, 5000);
                });
            }
        }

        // Thiết lập ngày tối thiểu cho form đăng ký nghỉ phép
        function initDateInputs() {
            // legacy - no-op now (calendar used)
        }

        // Khởi tạo khi trang tải: ưu tiên load từ database (server), sau đó mới checkLoginStatus
        (async function init() {
            try {
                await loadFromServerIfEnabled();
                if (!RESTORE_SESSION) {
                    currentUser = null;
                    localStorage.removeItem(STORAGE_KEYS.currentUser);
                } else {
                    // Đảm bảo currentUser được khôi phục từ localStorage (tránh mất phiên khi chuyển tab Trang chủ)
                    currentUser = StorageUtil.loadJson(STORAGE_KEYS.currentUser, null);
                }
                checkLoginStatus();
            } catch (e) {
                console.error('Lỗi khởi tạo ứng dụng:', e);
                checkLoginStatus(); // Vẫn hiển thị màn hình đăng nhập
            }
        })();

        // Tránh reload khi click tab Trang chủ khi đã ở trang chủ (giữ phiên đăng nhập)
        (function preventTrangChuReload() {
            function init() {
                const path = window.location.pathname || '';
                const isHomePage = path === '/' || path === '/QuanlynhanlucBS.html' || path.endsWith('/');
                if (!isHomePage) return;
                const trangChuTab = document.querySelector('.tabs .tab[data-tab=""]');
                if (trangChuTab) {
                    trangChuTab.addEventListener('click', function(e) {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                }
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        })();

        // Nếu có hash, thử mở đúng tab (có thể bị chặn bởi login/role)
        setTimeout(() => { activateTabFromHash(); }, 50);
        
        // Khởi tạo các form và inputs sau khi DOM đã load
        setTimeout(() => {
            initDateInputs();
            initLeaveForm();
        }, 200);

        // Trang con (pages/*): đảm bảo nội dung tab được khởi tạo sau khi đã load (lịch, bảng, ...)
        (function ensureStandaloneTabInit() {
            var path = window.location.pathname || '';
            if (path.indexOf('/pages/') === -1) return;
            var tabName = document.body && document.body.getAttribute('data-current-tab');
            if (!tabName || !tabName.trim()) return;
            tabName = tabName.trim();
            setTimeout(function() {
                try {
                    if (typeof initTabsForCurrentPage === 'function') initTabsForCurrentPage();
                } catch (e) {
                    console.warn('Khởi tạo tab trang con:', e);
                }
            }, 600);
        })();

        // Render debug information into the admin debug panel
        function renderDebugInfo() {
            const output = document.getElementById('debugOutput');
            if (!output) return;

            const data = {
                accounts: StorageUtil.loadJson(STORAGE_KEYS.accounts, {}),
                currentUser: StorageUtil.loadJson(STORAGE_KEYS.currentUser, null),
                doctorsLanhdao: StorageUtil.loadJson(STORAGE_KEYS.doctorsLanhdao, []),
                doctorscot1: StorageUtil.loadJson(STORAGE_KEYS.doctorscot1, []),
                doctorscot2: StorageUtil.loadJson(STORAGE_KEYS.doctorscot2, []),
                doctorscot3: StorageUtil.loadJson(STORAGE_KEYS.doctorscot3, []),
                doctorsPartime: StorageUtil.loadJson(STORAGE_KEYS.doctorsPartime, []),
                doctorsKhac: StorageUtil.loadJson(STORAGE_KEYS.doctorsKhac, []),
                leaveSubmissions: StorageUtil.loadJson(STORAGE_KEYS.leaveSubmissions, []),
                passwordRequests: StorageUtil.loadJson(STORAGE_KEYS.passwordRequests, [])
            };

            output.textContent = JSON.stringify(data, null, 2);
            console.log('Debug data:', data);
        }

        // ---------- Calendar + Leave Request logic ----------
        function startOfMonth(date) {
            return new Date(date.getFullYear(), date.getMonth(), 1);
        }

        function addMonths(date, m) {
            return new Date(date.getFullYear(), date.getMonth() + m, 1);
        }

        function renderThreeMonthCalendars(containerId, clickHandler, options) {
            const opts = options || {};
            const numCycles = opts.numCycles != null ? opts.numCycles : 3;
            const titleFormat = opts.titleFormat || 'range'; // 'range' | 'month'
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            const today = new Date();
            // Hiển thị C1, C2, C3 cho cả adminCalendarContainer và nghiphepCalendarContainer
            const isAdminCalendar = containerId === 'adminCalendarContainer' || containerId === 'nghiphepCalendarContainer';
            
            // Tính toán chu kỳ đầu tiên chứa ngày hiện tại (từ ngày 25 đến ngày 24)
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            // Nếu ngày hiện tại < 25, thì chu kỳ bắt đầu từ ngày 25 của tháng trước
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            
            const showMonthBatchButton = opts.showMonthBatchButton === true;
            const boundClick = (d) => clickHandler(d, containerId);
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderSingleMonthCycle(cycleStart, cycleEnd, boundClick, isAdminCalendar, titleFormat, showMonthBatchButton);
                container.appendChild(monthEl);
            }
        }

        function renderSingleMonthCycle(cycleStart, cycleEnd, clickHandler, isAdminCalendar = false, titleFormat = 'range', showMonthBatchButton = false) {
            const month = document.createElement('div');
            if (isAdminCalendar) month.className = 'calendar-month-card';
            // Nếu là admin calendar, hiển thị 1 tháng trên 1 hàng
            if (isAdminCalendar) {
                month.style.flex = '0 1 100%';
                month.style.width = '100%';
                month.style.minWidth = '100%';
                month.style.maxWidth = '100%';
            } else {
            month.style.flex = '1 1 360px';
            month.style.minWidth = '320px';
            }
            month.style.background = '#fff';
            month.style.borderRadius = '10px';
            month.style.padding = '14px';
            month.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';

            const titleRow = document.createElement('div');
            titleRow.style.display = 'flex';
            titleRow.style.alignItems = 'center';
            titleRow.style.justifyContent = titleFormat === 'month' && showMonthBatchButton ? 'flex-start' : 'space-between';
            titleRow.style.flexWrap = 'wrap';
            titleRow.style.gap = '10px';
            titleRow.style.marginBottom = '8px';
            const title = document.createElement('div');
            title.style.fontWeight = '700';
            if (titleFormat === 'month') {
                // Tab nghỉ phép: "Lịch nghỉ phép tháng X năm Y" – nút Đăng ký nghỉ cả tháng ngay cạnh bên phải tiêu đề
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                title.textContent = `Lịch nghỉ phép tháng ${monthNum} năm ${year}`;
                if (showMonthBatchButton) {
                    const btnMonth = document.createElement('button');
                    btnMonth.type = 'button';
                    btnMonth.className = 'export-pdf-btn';
                    btnMonth.style.cssText = 'padding:6px 12px;font-size:12px;margin-left:8px;';
                    btnMonth.textContent = '📆 Đăng ký nghỉ cả tháng';
                    btnMonth.onclick = function() { openBatchLeaveModalForMonth(monthNum, year); };
                    titleRow.appendChild(title);
                    titleRow.appendChild(btnMonth);
            } else {
                    title.style.textAlign = 'center';
                    title.style.width = '100%';
                    titleRow.appendChild(title);
                }
            } else {
                title.style.textAlign = 'center';
                title.style.width = '100%';
                // Hiển thị tiêu đề: "25/Tháng - 24/Tháng tiếp theo"
                const startMonth = cycleStart.toLocaleString('vi-VN', {month:'long', year:'numeric'});
                const endMonth = cycleEnd.toLocaleString('vi-VN', {month:'long', year:'numeric'});
                title.textContent = `${cycleStart.getDate()}/${cycleStart.getMonth() + 1} - ${cycleEnd.getDate()}/${cycleEnd.getMonth() + 1} (${startMonth.split(' ')[0]} - ${endMonth})`;
                titleRow.appendChild(title);
            }
            month.appendChild(titleRow);

            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7,1fr)';
            grid.style.gap = '8px';

            // weekday headers
            const weekdays = ['T2','T3','T4','T5','T6','T7','CN'];
            weekdays.forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.textAlign = 'center';
                wEl.style.fontSize = '14px';
                wEl.style.color = '#666';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });

            // Tính toán offset cho ngày đầu tiên của chu kỳ
            const firstWeekday = cycleStart.getDay();
            // convert Sunday(0) to index 6, others shift -1
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;

            // empty slots
            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                grid.appendChild(empty);
            }

            // Tạo danh sách tất cả các ngày trong chu kỳ (từ cycleStart đến cycleEnd)
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Render từng ngày trong chu kỳ — dùng ngày local (không dùng toISOString để tránh lệch múi giờ)
            const todayForCompare = new Date();
            const todayKey = todayForCompare.getFullYear() + '-' + String(todayForCompare.getMonth() + 1).padStart(2, '0') + '-' + String(todayForCompare.getDate()).padStart(2, '0');
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            for (const date of allDates) {
                const key = toLocalDateKey(date);
                const isPastDate = key < todayKey;
                // Tab đăng ký nghỉ phép (titleFormat === 'month'): ẩn ngày quá khứ để dễ phân biệt
                const hidePastDay = titleFormat === 'month' && isPastDate;
                
                // Kiểm tra xem có phải ngày hiện tại không (so sánh năm, tháng, ngày trực tiếp)
                const today = new Date();
                const isToday = date.getFullYear() === today.getFullYear() && 
                                date.getMonth() === today.getMonth() && 
                                date.getDate() === today.getDate();
                
                // Nếu là admin calendar, tạo div với 3 input cho C1, C2, C3
                if (isAdminCalendar) {
                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    // Nếu là ngày hiện tại, đóng khung xanh
                    if (isToday) {
                        dayCell.style.border = '3px solid #3498db';
                    } else {
                        dayCell.style.border = '1px solid #e6e9ef';
                    }
                    dayCell.style.borderRadius = '6px';
                    dayCell.style.padding = '8px';
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    dayCell.style.background = isHoliday ? '#d32f2f' : '#f8fafc';
                    if (isHoliday) dayCell.style.color = '#fff';
                    dayCell.style.minHeight = '140px';
                    dayCell.style.position = 'relative';
                    dayCell.style.display = 'flex';
                    dayCell.style.flexDirection = 'column';
                    dayCell.style.gap = '4px';
                    dayCell.style.width = '100%';
                    dayCell.style.minWidth = '0'; // Cho phép shrink trong grid
                    dayCell.style.maxWidth = '100%'; // Không vượt quá độ rộng grid
                    dayCell.style.overflow = 'hidden'; // Tránh overflow
                    dayCell.style.wordWrap = 'break-word'; // Cho phép wrap text
                    if (hidePastDay) {
                        dayCell.style.opacity = isHoliday ? '0.85' : '0.28';
                        if (!isHoliday) dayCell.style.background = '#e9ecef';
                        dayCell.style.pointerEvents = 'none';
                        dayCell.style.cursor = 'default';
                    }
                    
                    // Ngày
                    const dayLabel = document.createElement('div');
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayLabel.style.fontSize = '13px';
                    dayLabel.style.fontWeight = '600';
                    dayLabel.style.marginBottom = '4px';
                    dayLabel.style.display = 'flex';
                    dayLabel.style.alignItems = 'center';
                    dayLabel.style.justifyContent = 'space-between';
                    dayLabel.style.flexWrap = 'wrap'; // Cho phép xuống dòng nếu quá dài
                    dayLabel.style.gap = '2px'; // Khoảng cách giữa các phần tử
                    
                    // Kiểm tra xem có pending requests cho ngày này không
                    // Normalize date để đảm bảo so sánh chính xác
                    const normalizeDateForComparison = (dateStr) => {
                        if (!dateStr) return '';
                        // Nếu đã là format YYYY-MM-DD, trả về nguyên
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                            return dateStr;
                        }
                        // Nếu là format khác, cố gắng parse
                        try {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                return d.toISOString().split('T')[0];
                            }
                        } catch (e) {
                            // Ignore
                        }
                        return dateStr;
                    };
                    
                    const normalizedKey = normalizeDateForComparison(key);
                    // Lọc chính xác: chỉ lấy submissions có date khớp và status === 'pending'
                    const pendingSubsForDay = submissions.filter(s => {
                        if (!s || !s.date || s.status !== 'pending') return false;
                        const normalizedDate = normalizeDateForComparison(s.date);
                        return normalizedDate === normalizedKey;
                    });
                    const hasPendingRequests = pendingSubsForDay.length > 0;
                    
                    // Kiểm tra xem người dùng có quyền quản lý/duyệt nghỉ phép cho ít nhất 1 cộtkhông
                    const hasAnyPermission = hasPermissionForNghiPhepColumn('ld') || 
                                            hasPermissionForNghiPhepColumn('c1') || 
                                            hasPermissionForNghiPhepColumn('c2') || 
                                            hasPermissionForNghiPhepColumn('c3');
                    
                    // Thêm biểu tượng thông báo nếu có pending requests và người dùng có quyền
                    if (hasPendingRequests && hasAnyPermission) {
                        const notificationBadge = document.createElement('span');
                        notificationBadge.textContent = '🔔';
                        notificationBadge.style.fontSize = '14px';
                        notificationBadge.style.color = '#e74c3c';
                        notificationBadge.style.marginLeft = '4px';
                        notificationBadge.style.cursor = 'pointer';
                        notificationBadge.title = `${pendingSubsForDay.length} yêu cầu nghỉ phép chờ duyệt`;
                        dayLabel.appendChild(notificationBadge);
                    } else {
                        // Tạo một span trống để giữ layout
                        const spacer = document.createElement('span');
                        spacer.style.width = '16px';
                        dayLabel.appendChild(spacer);
                    }
                    
                    dayCell.appendChild(dayLabel);
                    if (isHoliday) {
                        const hl = getHolidayDisplayLabel(key);
                        if (hl.label) {
                            const holidayBadge = document.createElement('div');
                            holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                            holidayBadge.style.fontSize = '11px';
                            holidayBadge.style.marginBottom = '4px';
                            holidayBadge.style.fontWeight = '500';
                            dayCell.appendChild(holidayBadge);
                        }
                    }
                    
                    // Load dữ liệu đã lưu
                    let dayData = quanlynghiphepData[key] || { 
                        ld: { doctors: [], maxCount: 0 }, 
                        c1: { doctors: [], maxCount: 0 }, 
                        c2: { doctors: [], maxCount: 0 }, 
                        c3: { doctors: [], maxCount: 0 } 
                    };
                    if (!dayData.ld) dayData.ld = { doctors: [], maxCount: 0 };
                    
                    // Tự động thêm lịch nghỉ cố định (chỉ khi chưa có dữ liệu đã lưu; nếu admin đã bấm Lưu thì chỉ hiển thị đúng danh sách đã lưu)
                    const fixedDateObj = new Date(key + 'T00:00:00');
                    const fixedWeekday = fixedDateObj.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
                    const fixedWeekdayKey = fixedWeekday === 0 ? 7 : fixedWeekday;
                    
                    if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                        ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                            const savedCol = quanlynghiphepData[key] && quanlynghiphepData[key][col];
                            const hasSavedData = savedCol && typeof savedCol === 'object' && Array.isArray(savedCol.doctors);
                            if (hasSavedData) return; // Đã lưu cho cột này -> không merge lịch cố định (bỏ tick có hiệu lực)
                            const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                            if (fixedDoctors.length > 0) {
                                if (!dayData[col] || typeof dayData[col] !== 'object') {
                                    dayData[col] = { doctors: [], maxCount: 0 };
                                } else if (Array.isArray(dayData[col])) {
                                    dayData[col] = { doctors: dayData[col], maxCount: 0 };
                                }
                                if (!Array.isArray(dayData[col].doctors)) {
                                    dayData[col].doctors = [];
                                }
                                const existingDoctorKeys = dayData[col].doctors.map(d => {
                                    if (typeof d === 'string') return d;
                                    if (d && typeof d === 'object' && d.key) return d.key;
                                    return null;
                                }).filter(k => k);
                                fixedDoctors.forEach(fixedDoctor => {
                                    const fixedKey = fixedDoctor.key || fixedDoctor;
                                    if (!existingDoctorKeys.includes(fixedKey)) {
                                        dayData[col].doctors.push(fixedDoctor);
                                    }
                                });
                            }
                        });
                    }
                    
                    // Hỗ trợ format cũ (array) và format mới (object)
                    const getColumnData = (col) => {
                        let colData = dayData[col];
                        if (Array.isArray(colData)) {
                            return { doctors: colData, maxCount: 0 };
                        } else if (!colData || typeof colData !== 'object') {
                            return { doctors: [], maxCount: 0 };
                        } else if (!Array.isArray(colData.doctors)) {
                            return { doctors: [], maxCount: colData.maxCount || 0 };
                        }
                        return { doctors: colData.doctors, maxCount: colData.maxCount || 0 };
                    };
                    
                    const ldData = getColumnData('ld');
                    const c1Data = getColumnData('c1');
                    const c2Data = getColumnData('c2');
                    const c3Data = getColumnData('c3');
                    
                    // Get doctor names với period (format mới: object {key, period})
                    const getDoctorNames = (doctorData, column) => {
                        if (!Array.isArray(doctorData)) return [];
                        return doctorData.map(item => {
                            if (!item || typeof item !== 'object' || !item.key) return null;
                            const doctorKey = item.key;
                            const period = item.period || 'full';
                            const name = getDoctorNameByKey(doctorKey, column);
                            if (!name) return null;
                            // Thêm ký hiệu period vào tên
                            const periodLabel = period === 'morning' ? ' (Sáng)' : (period === 'afternoon' ? ' (Chiều)' : '');
                            return name + periodLabel;
                        }).filter(name => name);
                    };
                    
                    const ldNames = getDoctorNames(ldData.doctors, 'ld');
                    const c1Names = getDoctorNames(c1Data.doctors, 'c1');
                    const c2Names = getDoctorNames(c2Data.doctors, 'c2');
                    const c3Names = getDoctorNames(c3Data.doctors, 'c3');
                    
                    // Create table for each row
                    const createRow = (column, names, count, maxCount) => {
                        const row = document.createElement('div');
                        row.style.display = 'flex';
                        row.style.justifyContent = 'space-between';
                        row.style.alignItems = 'flex-start'; // Thay đổi từ 'center' sang 'flex-start' để align top khi text wrap
                        row.style.padding = '4px 0';
                        row.style.borderBottom = '1px solid #eee';
                        row.style.fontSize = '12px';
                        row.style.minWidth = '0'; // Cho phép shrink
                        
                        // Tính tổng số lượng bác sĩ nghỉ phép (đăng ký nghỉ phép + đã chọn thủ công) cho cộtnày
                        const approvedSubs = submissions.filter(s => s.date === key && s.status === 'approved');
                        const pendingSubs = submissions.filter(s => s.date === key && s.status === 'pending');
                        
                        // Lấy danh sách bác sĩ của cộtđể kiểm tra
                        const columnDoctors = column === 'ld' ? doctors.lanhdao : (column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3));
                        const columnDoctorKeys = columnDoctors.map(doc => normalizeKey(doc.name || doc.displayName || ''));
                        
                        // Lấy danh sách các bác sĩ đã đăng ký nghỉ phép (đã duyệt + đang chờ) trong cộtnày
                        const allDoctorKeys = new Set();
                        approvedSubs.forEach(s => {
                            const docKey = normalizeKey(s.doctorName || '');
                            if (columnDoctorKeys.includes(docKey)) {
                                allDoctorKeys.add(docKey);
                            }
                        });
                        pendingSubs.forEach(s => {
                            const docKey = normalizeKey(s.doctorName || '');
                            if (columnDoctorKeys.includes(docKey)) {
                                allDoctorKeys.add(docKey);
                            }
                        });
                        
                        // Lấy danh sách các bác sĩ đã được chọn thủ công (từ quanlynghiphepData)
                        let dayData = quanlynghiphepData[key] || { 
                            ld: { doctors: [], maxCount: 0 }, 
                            c1: { doctors: [], maxCount: 0 }, 
                            c2: { doctors: [], maxCount: 0 }, 
                            c3: { doctors: [], maxCount: 0 } 
                        };
                        if (!dayData.ld) dayData.ld = { doctors: [], maxCount: 0 };
                        
                        // Tự động thêm lịch nghỉ cố định (chỉ khi chưa có dữ liệu đã lưu; nếu admin đã bấm Lưu thì chỉ dùng danh sách đã lưu)
                        const fixedDateObj2 = new Date(key + 'T00:00:00');
                        const fixedWeekday2 = fixedDateObj2.getDay();
                        const fixedWeekdayKey2 = fixedWeekday2 === 0 ? 7 : fixedWeekday2;
                        
                        const savedCol = quanlynghiphepData[key] && quanlynghiphepData[key][column];
                        const hasSavedData = savedCol && typeof savedCol === 'object' && Array.isArray(savedCol.doctors);
                        if (fixedWeekdayKey2 >= 1 && fixedWeekdayKey2 <= 6 && !hasSavedData) {
                            const fixedDoctors = getFixedScheduleForWeekday(column, fixedWeekdayKey2);
                            if (fixedDoctors.length > 0) {
                                if (!dayData[column] || typeof dayData[column] !== 'object') {
                                    dayData[column] = { doctors: [], maxCount: 0 };
                                } else if (Array.isArray(dayData[column])) {
                                    dayData[column] = { doctors: dayData[column], maxCount: 0 };
                                }
                                if (!Array.isArray(dayData[column].doctors)) {
                                    dayData[column].doctors = [];
                                }
                                const existingDoctorKeys = dayData[column].doctors
                                    .filter(d => d && typeof d === 'object' && d.key)
                                    .map(d => d.key);
                                fixedDoctors.forEach(fixedDoctor => {
                                    const fixedKey = fixedDoctor.key || fixedDoctor;
                                    if (!existingDoctorKeys.includes(fixedKey)) {
                                        dayData[column].doctors.push(fixedDoctor);
                                    }
                                });
                            }
                        }
                        
                        let columnData = dayData[column];
                        if (Array.isArray(columnData)) {
                            columnData = { doctors: columnData, maxCount: 0 };
                        } else if (!columnData || typeof columnData !== 'object') {
                            columnData = { doctors: [], maxCount: 0 };
                        } else if (!Array.isArray(columnData.doctors)) {
                            columnData = { doctors: [], maxCount: 0 };
                        }
                        const manuallySelectedDoctors = columnData.doctors || [];
                        
                        // Thêm các bác sĩ đã được chọn thủ công vào Set (format mới: object {key, period})
                        manuallySelectedDoctors.forEach(item => {
                            if (!item || typeof item !== 'object' || !item.key) return;
                            const doctorKey = item.key;
                            if (columnDoctorKeys.includes(doctorKey)) {
                                allDoctorKeys.add(doctorKey);
                            }
                        });
                        
                        // Tổng số lượng = số lượng bác sĩ duy nhất (từ đăng ký nghỉ phép + từ đã chọn thủ công)
                        const totalRequestCount = allDoctorKeys.size;
                        
                        // Kiểm tra nếu tổng số lượng >= maxCount thì hiển thị màu vàng rơm
                        if (maxCount > 0 && totalRequestCount >= maxCount) {
                            row.style.background = '#f4d03f'; // Màu vàng rơm
                            row.style.borderLeft = '3px solid #f39c12';
                            row.style.paddingLeft = '8px';
                        }
                        
                        // Kiểm tra ngày có phải là ngày trong quá khứ không (không bao gồm ngày hiện tại)
                        const today = new Date();
                        const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                        // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
                        const isPastDate = key < todayKey;
                        
                        // Kiểm tra quyền cho cộtnày
                        const hasPermission = hasPermissionForNghiPhepColumn(column);
                        
                        if (hasPermission && !isPastDate) {
                            row.style.cursor = 'pointer';
                            row.onclick = (e) => {
                                e.stopPropagation();
                                openSelectDoctorsModal(key, column);
                            };
                        } else {
                            row.style.cursor = 'not-allowed';
                            row.style.opacity = '0.6';
                            if (isPastDate) {
                                row.title = 'Không thể chọn bác sĩ nghỉ phép cho ngày trong quá khứ';
                            } else {
                                row.title = 'Bạn không có quyền chọn bác sĩ nghỉ phép cho ' + (column === 'ld' ? 'Lãnh đạo' : (column === 'c1' ? 'cột1' : (column === 'c2' ? 'cột2' : 'cột3')));
                            }
                        }
                        
                        const label = document.createElement('div');
                        label.style.flex = '1';
                        label.style.textAlign = 'left';
                        const colLabel = column === 'ld' ? 'LĐ' : (column === 'c1' ? 'C1' : (column === 'c2' ? 'C2' : 'C3'));
                        const labelText = names.length > 0 ? `${colLabel} ${names.join(', ')}` : colLabel;
                        label.textContent = labelText;
                        label.style.minWidth = '0'; // Cho phép shrink trong flexbox
                        label.style.wordWrap = 'break-word'; // Cho phép wrap text
                        label.style.wordBreak = 'break-word'; // Break từ dài
                        label.style.overflowWrap = 'break-word'; // Wrap overflow
                        label.style.whiteSpace = 'normal'; // Cho phép xuống dòng
                        label.style.lineHeight = '1.4'; // Tăng line height cho dễ đọc
                        
                        const countDiv = document.createElement('div');
                        countDiv.textContent = count;
                        countDiv.style.minWidth = '20px';
                        countDiv.style.textAlign = 'right';
                        countDiv.style.fontWeight = '600';
                        countDiv.style.marginLeft = '4px';
                        
                        row.appendChild(label);
                        row.appendChild(countDiv);
                        return row;
                    };
                    
                    // Lấy maxCount từ cài đặt theo ngày trong tuần
                    const dateObj = new Date(key + 'T00:00:00');
                    const weekday = dateObj.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
                    const weekdayKey = weekday === 0 ? 7 : weekday; // Chuyển đổi: 0 (CN) -> 7, 1 (T2) -> 1, ..., 6 (T7) -> 6
                    
                    // Chỉ áp dụng cho Thứ 2 - Thứ 7 (1-6), Chủ nhật không có giới hạn
                    const ldMaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('ld', weekdayKey) : 0;
                    const c1MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c1', weekdayKey) : 0;
                    const c2MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c2', weekdayKey) : 0;
                    const c3MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c3', weekdayKey) : 0;
                    
                    // Add rows (LĐ trên C1)
                    dayCell.appendChild(createRow('ld', ldNames, ldNames.length, ldMaxCount));
                    dayCell.appendChild(createRow('c1', c1Names, c1Names.length, c1MaxCount));
                    dayCell.appendChild(createRow('c2', c2Names, c2Names.length, c2MaxCount));
                    dayCell.appendChild(createRow('c3', c3Names, c3Names.length, c3MaxCount));
                    
                    // Dòng nút đăng ký nhanh / hủy đăng ký nhanh (dưới C3)
                    if (typeof canRegisterOwnLeave === 'function' && canRegisterOwnLeave() && !hidePastDay) {
                        const quickRow = document.createElement('div');
                        quickRow.style.cssText = 'display:flex;gap:6px;margin-top:4px;padding-top:4px;border-top:1px dashed #ddd;font-size:10px;flex-wrap:wrap;';
                        const btnDk = document.createElement('button');
                        btnDk.type = 'button';
                        btnDk.textContent = 'ĐK nhanh';
                        btnDk.title = 'Đăng ký nghỉ phép nhanh (cả ngày)';
                        btnDk.style.cssText = 'padding:2px 6px;font-size:10px;cursor:pointer;background:#3498db;color:#fff;border:none;border-radius:4px;';
                        btnDk.onclick = (e) => { e.stopPropagation(); quickRegisterLeaveForDate(key); };
                        const btnHuy = document.createElement('button');
                        btnHuy.type = 'button';
                        btnHuy.textContent = 'Hủy ĐK';
                        btnHuy.title = 'Hủy đăng ký nghỉ phép nhanh';
                        const hasPending = typeof hasMyPendingForDate === 'function' && hasMyPendingForDate(key);
                        btnHuy.style.cssText = 'padding:2px 6px;font-size:10px;cursor:pointer;background:' + (hasPending ? '#e74c3c' : '#95a5a6') + ';color:#fff;border:none;border-radius:4px;';
                        btnHuy.disabled = !hasPending;
                        btnHuy.onclick = (e) => { e.stopPropagation(); if (hasPending) { cancelMyPendingForDate(key); if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars(); if (typeof renderAdminCalendars === 'function') renderAdminCalendars(); } };
                        quickRow.appendChild(btnDk);
                        quickRow.appendChild(btnHuy);
                        dayCell.appendChild(quickRow);
                    }
                    
                    // Show indicators for requests on this date
                    const subs = submissions.filter(s => s.date === key);
                    const count = subs.length;
                    const approvedSubs = subs.filter(s => s.status === 'approved');
                    const pendingSubs = subs.filter(s => s.status === 'pending');
                    const rejectedSubs = subs.filter(s => s.status === 'rejected');
                    const approvedCount = approvedSubs.length;
                    const pendingCount = pendingSubs.length;
                    const rejectedCount = rejectedSubs.length;
                    const hasApproved = approvedCount > 0;
                    const hasPending = pendingCount > 0;
                    const hasRejected = rejectedCount > 0;
                    
                    // Nếu là ngày hiện tại, ưu tiên hiển thị viền xanh
                    if (isToday) {
                        dayCell.style.border = '3px solid #3498db';
                    }
                    
                    if (!isHoliday) {
                        if (hasApproved) {
                            dayCell.style.background = '#e9f9ee';
                            if (!isToday) {
                                dayCell.style.borderColor = '#27ae60';
                            }
                        } else if (hasPending) {
                            dayCell.style.background = '#fff8e6';
                            if (!isToday) {
                                dayCell.style.borderColor = '#f39c12';
                            }
                        } else if (hasRejected) {
                            dayCell.style.background = '#fff0f0';
                            if (!isToday) {
                                dayCell.style.borderColor = '#e74c3c';
                            }
                        }
                    }
                    
                    // Tạo tooltip cho ô ngày
                    const tooltipParts = [];
                    if (approvedCount > 0) tooltipParts.push(`✅ ${approvedCount} đã duyệt`);
                    if (pendingCount > 0) tooltipParts.push(`⏳ ${pendingCount} chờ duyệt`);
                    if (rejectedCount > 0) tooltipParts.push(`❌ ${rejectedCount} từ chối`);
                    if (tooltipParts.length > 0) {
                        dayCell.title = tooltipParts.join(' | ');
                    }
                    
                    // Hiển thị badge theo từng loại trạng thái
                    const badgeContainer = document.createElement('div');
                    badgeContainer.style.position = 'absolute';
                    badgeContainer.style.top = '4px';
                    badgeContainer.style.right = '4px';
                    badgeContainer.style.display = 'flex';
                    badgeContainer.style.gap = '4px';
                    badgeContainer.style.flexDirection = 'row-reverse';
                    
                    // Badge đã duyệt (xanh)
                    if (hasApproved) {
                        const badge = document.createElement('div');
                        badge.textContent = approvedCount;
                        badge.style.background = '#27ae60';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `✅ ${approvedCount} yêu cầu đã duyệt`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    // Badge chờ duyệt (vàng)
                    if (hasPending) {
                        const badge = document.createElement('div');
                        badge.textContent = pendingCount;
                        badge.style.background = '#f39c12';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `⏳ ${pendingCount} yêu cầu chờ duyệt`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    // Badge từ chối (đỏ)
                    if (hasRejected) {
                        const badge = document.createElement('div');
                        badge.textContent = rejectedCount;
                        badge.style.background = '#e74c3c';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `❌ ${rejectedCount} yêu cầu từ chối`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    if (badgeContainer.children.length > 0) {
                        dayCell.appendChild(badgeContainer);
                    }
                    
                    // Click vào vùng trống để mở modal duyệt nghỉ phép (admin) hoặc đăng ký nghỉ phép (bác sĩ). Tab đăng ký: không cho click vào ngày quá khứ.
                    const isPastAndHide = (typeof hidePastDayMonth !== 'undefined' ? hidePastDayMonth : hidePastDay);
                    if (!isPastAndHide) {
                        dayCell.style.cursor = 'pointer';
                        dayCell.onclick = (e) => {
                            if (e.target === dayCell || e.target === dayLabel) {
                                clickHandler(date);
                            }
                        };
                    }
                    grid.appendChild(dayCell);
                } else {
                    // Calendar thường (cho user đăng ký nghỉ phép)
                const btn = document.createElement('button');
                    // Nếu là ngày hiện tại, đóng khung xanh
                    if (isToday) {
                        btn.style.border = '3px solid #3498db';
                    } else {
                btn.style.border = '1px solid #e6e9ef';
                    }
                btn.style.borderRadius = '6px';
                btn.style.padding = '12px';
                btn.style.background = '#f8fafc';
                btn.style.cursor = 'pointer';
                btn.style.minHeight = '64px';
                btn.style.fontSize = '16px';
                btn.style.position = 'relative';
                btn.textContent = date.getDate();

                // show indicators for requests on this date and color by status
                const subs = submissions.filter(s => s.date === key);
                const count = subs.length;
                const approvedSubs = subs.filter(s => s.status === 'approved');
                const pendingSubs = subs.filter(s => s.status === 'pending');
                const rejectedSubs = subs.filter(s => s.status === 'rejected');
                const approvedCount = approvedSubs.length;
                const pendingCount = pendingSubs.length;
                const rejectedCount = rejectedSubs.length;
                const hasApproved = approvedCount > 0;
                const hasPending = pendingCount > 0;
                const hasRejected = rejectedCount > 0;

                    // Nếu là ngày hiện tại, ưu tiên hiển thị viền xanh
                    if (isToday) {
                        btn.style.border = '3px solid #3498db';
                    }

                if (hasApproved) {
                    btn.style.background = '#e9f9ee';
                        if (!isToday) {
                    btn.style.borderColor = '#27ae60';
                        }
                } else if (hasPending) {
                    btn.style.background = '#fff8e6';
                        if (!isToday) {
                    btn.style.borderColor = '#f39c12';
                        }
                } else if (hasRejected) {
                    btn.style.background = '#fff0f0';
                        if (!isToday) {
                    btn.style.borderColor = '#e74c3c';
                        }
                }

                // Tạo tooltip cho ô ngày
                const tooltipParts = [];
                if (approvedCount > 0) tooltipParts.push(`✅ ${approvedCount} đã duyệt`);
                if (pendingCount > 0) tooltipParts.push(`⏳ ${pendingCount} chờ duyệt`);
                if (rejectedCount > 0) tooltipParts.push(`❌ ${rejectedCount} từ chối`);
                if (tooltipParts.length > 0) {
                    btn.title = tooltipParts.join(' | ');
                }

                // Hiển thị badge theo từng loại trạng thái
                const badgeContainer = document.createElement('div');
                badgeContainer.style.position = 'absolute';
                badgeContainer.style.top = '6px';
                badgeContainer.style.right = '6px';
                badgeContainer.style.display = 'flex';
                badgeContainer.style.gap = '4px';
                badgeContainer.style.flexDirection = 'row-reverse';
                
                // Badge đã duyệt (xanh)
                if (hasApproved) {
                    const badge = document.createElement('div');
                    badge.textContent = approvedCount;
                    badge.style.background = '#27ae60';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `✅ ${approvedCount} yêu cầu đã duyệt`;
                    badgeContainer.appendChild(badge);
                }
                
                // Badge chờ duyệt (vàng)
                if (hasPending) {
                    const badge = document.createElement('div');
                    badge.textContent = pendingCount;
                    badge.style.background = '#f39c12';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `⏳ ${pendingCount} yêu cầu chờ duyệt`;
                    badgeContainer.appendChild(badge);
                }
                
                // Badge từ chối (đỏ)
                if (hasRejected) {
                    const badge = document.createElement('div');
                    badge.textContent = rejectedCount;
                    badge.style.background = '#e74c3c';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `❌ ${rejectedCount} yêu cầu từ chối`;
                    badgeContainer.appendChild(badge);
                }
                
                if (badgeContainer.children.length > 0) {
                    btn.appendChild(badgeContainer);
                }

                // disable past dates (cannot request before today)
                const today = new Date();
                const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                const dateKey = key;
                // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
                if (dateKey < todayKey) {
                    btn.style.opacity = '0.45';
                    btn.style.cursor = 'default';
                    btn.disabled = true;
                } else {
                    btn.onclick = () => clickHandler(date);
                }
                grid.appendChild(btn);
                }
            }

            month.appendChild(grid);
            return month;
        }

        function renderSingleMonth(firstDay, clickHandler, isAdminCalendar = false) {
            const month = document.createElement('div');
            // Nếu là admin calendar, hiển thị 1 tháng trên 1 hàng
            if (isAdminCalendar) {
                month.style.flex = '0 1 100%';
                month.style.width = '100%';
                month.style.minWidth = '100%';
                month.style.maxWidth = '100%';
            } else {
            month.style.flex = '1 1 360px';
            month.style.minWidth = '320px';
            }
            month.style.background = '#fff';
            month.style.borderRadius = '10px';
            month.style.padding = '14px';
            month.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';

            const title = document.createElement('div');
            title.style.textAlign = 'center';
            title.style.fontWeight = '700';
            title.style.marginBottom = '8px';
            title.textContent = firstDay.toLocaleString('vi-VN', {month:'long', year:'numeric'});
            month.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7,1fr)';
            grid.style.gap = '8px';

            // weekday headers
            const weekdays = ['T2','T3','T4','T5','T6','T7','CN'];
            weekdays.forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.textAlign = 'center';
                wEl.style.fontSize = '14px';
                wEl.style.color = '#666';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });

            const year = firstDay.getFullYear();
            const monthIdx = firstDay.getMonth();
            const firstWeekday = new Date(year, monthIdx, 1).getDay();
            // convert Sunday(0) to index 6, others shift -1
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

            // empty slots
            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                grid.appendChild(empty);
            }

            const todayObj = new Date();
            const todayKeyForMonth = todayObj.getFullYear() + '-' + String(todayObj.getMonth() + 1).padStart(2, '0') + '-' + String(todayObj.getDate()).padStart(2, '0');
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, monthIdx, d);
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                const isPastDateMonth = key < todayKeyForMonth;
                const hidePastDayMonth = (typeof titleFormat !== 'undefined' && titleFormat === 'month') && isPastDateMonth;
                
                // Kiểm tra xem có phải ngày hiện tại không (so sánh năm, tháng, ngày trực tiếp)
                const today = new Date();
                const isToday = date.getFullYear() === today.getFullYear() && 
                                date.getMonth() === today.getMonth() && 
                                date.getDate() === today.getDate();
                
                // Nếu là admin calendar, tạo div với 3 input cho C1, C2, C3
                if (isAdminCalendar) {
                    const dayCell = document.createElement('div');
                    const isHolidayMonth = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    const isHoliday = isHolidayMonth;
                    // Nếu là ngày hiện tại, đóng khung xanh
                    if (isToday) {
                        dayCell.style.border = '3px solid #3498db';
                    } else {
                        dayCell.style.border = '1px solid #e6e9ef';
                    }
                    dayCell.style.borderRadius = '6px';
                    dayCell.style.padding = '8px';
                    dayCell.style.background = isHolidayMonth ? '#d32f2f' : '#f8fafc';
                    if (isHolidayMonth) dayCell.style.color = '#fff';
                    dayCell.style.minHeight = '140px';
                    dayCell.style.position = 'relative';
                    dayCell.style.display = 'flex';
                    dayCell.style.flexDirection = 'column';
                    dayCell.style.gap = '4px';
                    dayCell.style.width = '100%';
                    dayCell.style.minWidth = '0'; // Cho phép shrink trong grid
                    dayCell.style.maxWidth = '100%'; // Không vượt quá độ rộng grid
                    dayCell.style.overflow = 'hidden'; // Tránh overflow
                    dayCell.style.wordWrap = 'break-word'; // Cho phép wrap text
                    if (hidePastDayMonth) {
                        dayCell.style.opacity = isHolidayMonth ? '0.85' : '0.28';
                        if (!isHolidayMonth) dayCell.style.background = '#e9ecef';
                        dayCell.style.pointerEvents = 'none';
                        dayCell.style.cursor = 'default';
                    }
                    
                    // Ngày
                    const dayLabel = document.createElement('div');
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayLabel.style.fontSize = '13px';
                    dayLabel.style.fontWeight = '600';
                    dayLabel.style.marginBottom = '4px';
                    dayLabel.style.display = 'flex';
                    dayLabel.style.alignItems = 'center';
                    dayLabel.style.justifyContent = 'space-between';
                    dayLabel.style.flexWrap = 'wrap'; // Cho phép xuống dòng nếu quá dài
                    dayLabel.style.gap = '2px'; // Khoảng cách giữa các phần tử
                    
                    // Kiểm tra xem có pending requests cho ngày này không
                    // Normalize date để đảm bảo so sánh chính xác
                    const normalizeDateForComparison = (dateStr) => {
                        if (!dateStr) return '';
                        // Nếu đã là format YYYY-MM-DD, trả về nguyên
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                            return dateStr;
                        }
                        // Nếu là format khác, cố gắng parse
                        try {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                return d.toISOString().split('T')[0];
                            }
                        } catch (e) {
                            // Ignore
                        }
                        return dateStr;
                    };
                    
                    const normalizedKey = normalizeDateForComparison(key);
                    // Lọc chính xác: chỉ lấy submissions có date khớp và status === 'pending'
                    const pendingSubsForDay = submissions.filter(s => {
                        if (!s || !s.date || s.status !== 'pending') return false;
                        const normalizedDate = normalizeDateForComparison(s.date);
                        return normalizedDate === normalizedKey;
                    });
                    const hasPendingRequests = pendingSubsForDay.length > 0;
                    
                    // Kiểm tra xem người dùng có quyền quản lý/duyệt nghỉ phép cho ít nhất 1 cộtkhông
                    const hasAnyPermission = hasPermissionForNghiPhepColumn('ld') || 
                                            hasPermissionForNghiPhepColumn('c1') || 
                                            hasPermissionForNghiPhepColumn('c2') || 
                                            hasPermissionForNghiPhepColumn('c3');
                    
                    // Thêm biểu tượng thông báo nếu có pending requests và người dùng có quyền
                    if (hasPendingRequests && hasAnyPermission) {
                        const notificationBadge = document.createElement('span');
                        notificationBadge.textContent = '🔔';
                        notificationBadge.style.fontSize = '14px';
                        notificationBadge.style.color = '#e74c3c';
                        notificationBadge.style.marginLeft = '4px';
                        notificationBadge.style.cursor = 'pointer';
                        notificationBadge.title = `${pendingSubsForDay.length} yêu cầu nghỉ phép chờ duyệt`;
                        dayLabel.appendChild(notificationBadge);
                    } else {
                        // Tạo một span trống để giữ layout
                        const spacer = document.createElement('span');
                        spacer.style.width = '16px';
                        dayLabel.appendChild(spacer);
                    }
                    
                    dayCell.appendChild(dayLabel);
                    if (isHoliday) {
                        const hl = getHolidayDisplayLabel(key);
                        if (hl.label) {
                            const holidayBadge = document.createElement('div');
                            holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                            holidayBadge.style.fontSize = '11px';
                            holidayBadge.style.marginBottom = '4px';
                            holidayBadge.style.fontWeight = '500';
                            dayCell.appendChild(holidayBadge);
                        }
                    }
                    
                    // Load dữ liệu đã lưu
                    let dayData = quanlynghiphepData[key] || { 
                        ld: { doctors: [], maxCount: 0 }, 
                        c1: { doctors: [], maxCount: 0 }, 
                        c2: { doctors: [], maxCount: 0 }, 
                        c3: { doctors: [], maxCount: 0 } 
                    };
                    if (!dayData.ld) dayData.ld = { doctors: [], maxCount: 0 };
                    
                    // Tự động thêm lịch nghỉ cố định (chỉ khi chưa có dữ liệu đã lưu; nếu admin đã bấm Lưu thì chỉ hiển thị đúng danh sách đã lưu)
                    const fixedDateObj = new Date(key + 'T00:00:00');
                    const fixedWeekday = fixedDateObj.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
                    const fixedWeekdayKey = fixedWeekday === 0 ? 7 : fixedWeekday;
                    
                    if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                        ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                            const savedCol = quanlynghiphepData[key] && quanlynghiphepData[key][col];
                            const hasSavedData = savedCol && typeof savedCol === 'object' && Array.isArray(savedCol.doctors);
                            if (hasSavedData) return; // Đã lưu cho cột này -> không merge lịch cố định (bỏ tick có hiệu lực)
                            const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                            if (fixedDoctors.length > 0) {
                                if (!dayData[col] || typeof dayData[col] !== 'object') {
                                    dayData[col] = { doctors: [], maxCount: 0 };
                                } else if (Array.isArray(dayData[col])) {
                                    dayData[col] = { doctors: dayData[col], maxCount: 0 };
                                }
                                if (!Array.isArray(dayData[col].doctors)) {
                                    dayData[col].doctors = [];
                                }
                                const existingDoctorKeys = dayData[col].doctors.map(d => {
                                    if (typeof d === 'string') return d;
                                    if (d && typeof d === 'object' && d.key) return d.key;
                                    return null;
                                }).filter(k => k);
                                fixedDoctors.forEach(fixedDoctor => {
                                    const fixedKey = fixedDoctor.key || fixedDoctor;
                                    if (!existingDoctorKeys.includes(fixedKey)) {
                                        dayData[col].doctors.push(fixedDoctor);
                                    }
                                });
                            }
                        });
                    }
                    
                    // Hỗ trợ format cũ (array) và format mới (object)
                    const getColumnData = (col) => {
                        let colData = dayData[col];
                        if (Array.isArray(colData)) {
                            return { doctors: colData, maxCount: 0 };
                        } else if (!colData || typeof colData !== 'object') {
                            return { doctors: [], maxCount: 0 };
                        } else if (!Array.isArray(colData.doctors)) {
                            return { doctors: [], maxCount: colData.maxCount || 0 };
                        }
                        return { doctors: colData.doctors, maxCount: colData.maxCount || 0 };
                    };
                    
                    const ldData = getColumnData('ld');
                    const c1Data = getColumnData('c1');
                    const c2Data = getColumnData('c2');
                    const c3Data = getColumnData('c3');
                    
                    // Get doctor names với period (format mới: object {key, period})
                    const getDoctorNames = (doctorData, column) => {
                        if (!Array.isArray(doctorData)) return [];
                        return doctorData.map(item => {
                            if (!item || typeof item !== 'object' || !item.key) return null;
                            const doctorKey = item.key;
                            const period = item.period || 'full';
                            const name = getDoctorNameByKey(doctorKey, column);
                            if (!name) return null;
                            // Thêm ký hiệu period vào tên
                            const periodLabel = period === 'morning' ? ' (Sáng)' : (period === 'afternoon' ? ' (Chiều)' : '');
                            return name + periodLabel;
                        }).filter(name => name);
                    };
                    
                    const ldNames = getDoctorNames(ldData.doctors, 'ld');
                    const c1Names = getDoctorNames(c1Data.doctors, 'c1');
                    const c2Names = getDoctorNames(c2Data.doctors, 'c2');
                    const c3Names = getDoctorNames(c3Data.doctors, 'c3');
                    
                    // Create table for each row
                    const createRow = (column, names, count, maxCount) => {
                        const row = document.createElement('div');
                        row.style.display = 'flex';
                        row.style.justifyContent = 'space-between';
                        row.style.alignItems = 'flex-start'; // Thay đổi từ 'center' sang 'flex-start' để align top khi text wrap
                        row.style.padding = '4px 0';
                        row.style.borderBottom = '1px solid #eee';
                        row.style.fontSize = '12px';
                        row.style.minWidth = '0'; // Cho phép shrink
                        
                        // Tính tổng số lượng bác sĩ nghỉ phép (đăng ký nghỉ phép + đã chọn thủ công) cho cộtnày
                        const approvedSubs = submissions.filter(s => s.date === key && s.status === 'approved');
                        const pendingSubs = submissions.filter(s => s.date === key && s.status === 'pending');
                        
                        // Lấy danh sách bác sĩ của cộtđể kiểm tra
                        const columnDoctors = column === 'ld' ? doctors.lanhdao : (column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3));
                        const columnDoctorKeys = columnDoctors.map(doc => normalizeKey(doc.name || doc.displayName || ''));
                        
                        // Lấy danh sách các bác sĩ đã đăng ký nghỉ phép (đã duyệt + đang chờ) trong cộtnày
                        const allDoctorKeys = new Set();
                        approvedSubs.forEach(s => {
                            const docKey = normalizeKey(s.doctorName || '');
                            if (columnDoctorKeys.includes(docKey)) {
                                allDoctorKeys.add(docKey);
                            }
                        });
                        pendingSubs.forEach(s => {
                            const docKey = normalizeKey(s.doctorName || '');
                            if (columnDoctorKeys.includes(docKey)) {
                                allDoctorKeys.add(docKey);
                            }
                        });
                        
                        // Lấy danh sách các bác sĩ đã được chọn thủ công (từ quanlynghiphepData)
                        let dayData = quanlynghiphepData[key] || { 
                            ld: { doctors: [], maxCount: 0 }, 
                            c1: { doctors: [], maxCount: 0 }, 
                            c2: { doctors: [], maxCount: 0 }, 
                            c3: { doctors: [], maxCount: 0 } 
                        };
                        if (!dayData.ld) dayData.ld = { doctors: [], maxCount: 0 };
                        
                        // Tự động thêm lịch nghỉ cố định (chỉ khi chưa có dữ liệu đã lưu; nếu admin đã bấm Lưu thì chỉ dùng danh sách đã lưu)
                        const fixedDateObj2 = new Date(key + 'T00:00:00');
                        const fixedWeekday2 = fixedDateObj2.getDay();
                        const fixedWeekdayKey2 = fixedWeekday2 === 0 ? 7 : fixedWeekday2;
                        
                        const savedCol = quanlynghiphepData[key] && quanlynghiphepData[key][column];
                        const hasSavedData = savedCol && typeof savedCol === 'object' && Array.isArray(savedCol.doctors);
                        if (fixedWeekdayKey2 >= 1 && fixedWeekdayKey2 <= 6 && !hasSavedData) {
                            const fixedDoctors = getFixedScheduleForWeekday(column, fixedWeekdayKey2);
                            if (fixedDoctors.length > 0) {
                                if (!dayData[column] || typeof dayData[column] !== 'object') {
                                    dayData[column] = { doctors: [], maxCount: 0 };
                                } else if (Array.isArray(dayData[column])) {
                                    dayData[column] = { doctors: dayData[column], maxCount: 0 };
                                }
                                if (!Array.isArray(dayData[column].doctors)) {
                                    dayData[column].doctors = [];
                                }
                                const existingDoctorKeys = dayData[column].doctors
                                    .filter(d => d && typeof d === 'object' && d.key)
                                    .map(d => d.key);
                                fixedDoctors.forEach(fixedDoctor => {
                                    const fixedKey = fixedDoctor.key || fixedDoctor;
                                    if (!existingDoctorKeys.includes(fixedKey)) {
                                        dayData[column].doctors.push(fixedDoctor);
                                    }
                                });
                            }
                        }
                        
                        let columnData = dayData[column];
                        if (Array.isArray(columnData)) {
                            columnData = { doctors: columnData, maxCount: 0 };
                        } else if (!columnData || typeof columnData !== 'object') {
                            columnData = { doctors: [], maxCount: 0 };
                        } else if (!Array.isArray(columnData.doctors)) {
                            columnData = { doctors: [], maxCount: 0 };
                        }
                        const manuallySelectedDoctors = columnData.doctors || [];
                        
                        // Thêm các bác sĩ đã được chọn thủ công vào Set (format mới: object {key, period})
                        manuallySelectedDoctors.forEach(item => {
                            if (!item || typeof item !== 'object' || !item.key) return;
                            const doctorKey = item.key;
                            if (columnDoctorKeys.includes(doctorKey)) {
                                allDoctorKeys.add(doctorKey);
                            }
                        });
                        
                        // Tổng số lượng = số lượng bác sĩ duy nhất (từ đăng ký nghỉ phép + từ đã chọn thủ công)
                        const totalRequestCount = allDoctorKeys.size;
                        
                        // Kiểm tra nếu tổng số lượng >= maxCount thì hiển thị màu vàng rơm
                        if (maxCount > 0 && totalRequestCount >= maxCount) {
                            row.style.background = '#f4d03f'; // Màu vàng rơm
                            row.style.borderLeft = '3px solid #f39c12';
                            row.style.paddingLeft = '8px';
                        }
                        
                        // Kiểm tra ngày có phải là ngày trong quá khứ không (không bao gồm ngày hiện tại)
                        const today = new Date();
                        const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                        // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
                        const isPastDate = key < todayKey;
                        
                        // Kiểm tra quyền cho cộtnày
                        const hasPermission = hasPermissionForNghiPhepColumn(column);
                        
                        if (hasPermission && !isPastDate) {
                            row.style.cursor = 'pointer';
                            row.onclick = (e) => {
                                e.stopPropagation();
                                openSelectDoctorsModal(key, column);
                            };
                        } else {
                            row.style.cursor = 'not-allowed';
                            row.style.opacity = '0.6';
                            if (isPastDate) {
                                row.title = 'Không thể chọn bác sĩ nghỉ phép cho ngày trong quá khứ';
                            } else {
                                row.title = 'Bạn không có quyền chọn bác sĩ nghỉ phép cho ' + (column === 'ld' ? 'Lãnh đạo' : (column === 'c1' ? 'cột1' : (column === 'c2' ? 'cột2' : 'cột3')));
                            }
                        }
                        
                        const label = document.createElement('div');
                        label.style.flex = '1';
                        label.style.textAlign = 'left';
                        const colLabel = column === 'ld' ? 'LĐ' : (column === 'c1' ? 'C1' : (column === 'c2' ? 'C2' : 'C3'));
                        const labelText = names.length > 0 ? `${colLabel} ${names.join(', ')}` : colLabel;
                        label.textContent = labelText;
                        label.style.minWidth = '0'; // Cho phép shrink trong flexbox
                        label.style.wordWrap = 'break-word'; // Cho phép wrap text
                        label.style.wordBreak = 'break-word'; // Break từ dài
                        label.style.overflowWrap = 'break-word'; // Wrap overflow
                        label.style.whiteSpace = 'normal'; // Cho phép xuống dòng
                        label.style.lineHeight = '1.4'; // Tăng line height cho dễ đọc
                        
                        const countDiv = document.createElement('div');
                        countDiv.textContent = count;
                        countDiv.style.minWidth = '20px';
                        countDiv.style.textAlign = 'right';
                        countDiv.style.fontWeight = '600';
                        countDiv.style.marginLeft = '4px';
                        
                        row.appendChild(label);
                        row.appendChild(countDiv);
                        return row;
                    };
                    
                    // Lấy maxCount từ cài đặt theo ngày trong tuần
                    const dateObj = new Date(key + 'T00:00:00');
                    const weekday = dateObj.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
                    const weekdayKey = weekday === 0 ? 7 : weekday; // Chuyển đổi: 0 (CN) -> 7, 1 (T2) -> 1, ..., 6 (T7) -> 6
                    
                    // Chỉ áp dụng cho Thứ 2 - Thứ 7 (1-6), Chủ nhật không có giới hạn
                    const ldMaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('ld', weekdayKey) : 0;
                    const c1MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c1', weekdayKey) : 0;
                    const c2MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c2', weekdayKey) : 0;
                    const c3MaxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday('c3', weekdayKey) : 0;
                    
                    // Add rows (LĐ trên C1)
                    dayCell.appendChild(createRow('ld', ldNames, ldNames.length, ldMaxCount));
                    dayCell.appendChild(createRow('c1', c1Names, c1Names.length, c1MaxCount));
                    dayCell.appendChild(createRow('c2', c2Names, c2Names.length, c2MaxCount));
                    dayCell.appendChild(createRow('c3', c3Names, c3Names.length, c3MaxCount));
                    
                    // Dòng nút đăng ký nhanh / hủy đăng ký nhanh (dưới C3)
                    if (typeof canRegisterOwnLeave === 'function' && canRegisterOwnLeave() && !hidePastDay) {
                        const quickRow = document.createElement('div');
                        quickRow.style.cssText = 'display:flex;gap:6px;margin-top:4px;padding-top:4px;border-top:1px dashed #ddd;font-size:10px;flex-wrap:wrap;';
                        const btnDk = document.createElement('button');
                        btnDk.type = 'button';
                        btnDk.textContent = 'ĐK nhanh';
                        btnDk.title = 'Đăng ký nghỉ phép nhanh (cả ngày)';
                        btnDk.style.cssText = 'padding:2px 6px;font-size:10px;cursor:pointer;background:#3498db;color:#fff;border:none;border-radius:4px;';
                        btnDk.onclick = (e) => { e.stopPropagation(); quickRegisterLeaveForDate(key); };
                        const btnHuy = document.createElement('button');
                        btnHuy.type = 'button';
                        btnHuy.textContent = 'Hủy ĐK';
                        btnHuy.title = 'Hủy đăng ký nghỉ phép nhanh';
                        const hasPending = typeof hasMyPendingForDate === 'function' && hasMyPendingForDate(key);
                        btnHuy.style.cssText = 'padding:2px 6px;font-size:10px;cursor:pointer;background:' + (hasPending ? '#e74c3c' : '#95a5a6') + ';color:#fff;border:none;border-radius:4px;';
                        btnHuy.disabled = !hasPending;
                        btnHuy.onclick = (e) => { e.stopPropagation(); if (hasPending) { cancelMyPendingForDate(key); if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars(); if (typeof renderAdminCalendars === 'function') renderAdminCalendars(); } };
                        quickRow.appendChild(btnDk);
                        quickRow.appendChild(btnHuy);
                        dayCell.appendChild(quickRow);
                    }
                    
                    // Show indicators for requests on this date
                    const subs = submissions.filter(s => s.date === key);
                    const count = subs.length;
                    const approvedSubs = subs.filter(s => s.status === 'approved');
                    const pendingSubs = subs.filter(s => s.status === 'pending');
                    const rejectedSubs = subs.filter(s => s.status === 'rejected');
                    const approvedCount = approvedSubs.length;
                    const pendingCount = pendingSubs.length;
                    const rejectedCount = rejectedSubs.length;
                    const hasApproved = approvedCount > 0;
                    const hasPending = pendingCount > 0;
                    const hasRejected = rejectedCount > 0;
                    
                    // Nếu là ngày hiện tại, ưu tiên hiển thị viền xanh
                    if (isToday) {
                        dayCell.style.border = '3px solid #3498db';
                    }
                    
                    if (!isHoliday) {
                        if (hasApproved) {
                            dayCell.style.background = '#e9f9ee';
                            if (!isToday) {
                                dayCell.style.borderColor = '#27ae60';
                            }
                        } else if (hasPending) {
                            dayCell.style.background = '#fff8e6';
                            if (!isToday) {
                                dayCell.style.borderColor = '#f39c12';
                            }
                        } else if (hasRejected) {
                            dayCell.style.background = '#fff0f0';
                            if (!isToday) {
                                dayCell.style.borderColor = '#e74c3c';
                            }
                        }
                    }
                    
                    // Tạo tooltip cho ô ngày
                    const tooltipParts = [];
                    if (approvedCount > 0) tooltipParts.push(`✅ ${approvedCount} đã duyệt`);
                    if (pendingCount > 0) tooltipParts.push(`⏳ ${pendingCount} chờ duyệt`);
                    if (rejectedCount > 0) tooltipParts.push(`❌ ${rejectedCount} từ chối`);
                    if (tooltipParts.length > 0) {
                        dayCell.title = tooltipParts.join(' | ');
                    }
                    
                    // Hiển thị badge theo từng loại trạng thái
                    const badgeContainer = document.createElement('div');
                    badgeContainer.style.position = 'absolute';
                    badgeContainer.style.top = '4px';
                    badgeContainer.style.right = '4px';
                    badgeContainer.style.display = 'flex';
                    badgeContainer.style.gap = '4px';
                    badgeContainer.style.flexDirection = 'row-reverse';
                    
                    // Badge đã duyệt (xanh)
                    if (hasApproved) {
                        const badge = document.createElement('div');
                        badge.textContent = approvedCount;
                        badge.style.background = '#27ae60';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `✅ ${approvedCount} yêu cầu đã duyệt`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    // Badge chờ duyệt (vàng)
                    if (hasPending) {
                        const badge = document.createElement('div');
                        badge.textContent = pendingCount;
                        badge.style.background = '#f39c12';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `⏳ ${pendingCount} yêu cầu chờ duyệt`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    // Badge từ chối (đỏ)
                    if (hasRejected) {
                        const badge = document.createElement('div');
                        badge.textContent = rejectedCount;
                        badge.style.background = '#e74c3c';
                        badge.style.color = '#fff';
                        badge.style.borderRadius = '10px';
                        badge.style.padding = '2px 6px';
                        badge.style.fontSize = '12px';
                        badge.style.fontWeight = 'bold';
                        badge.style.minWidth = '20px';
                        badge.style.textAlign = 'center';
                        badge.title = `❌ ${rejectedCount} yêu cầu từ chối`;
                        badgeContainer.appendChild(badge);
                    }
                    
                    if (badgeContainer.children.length > 0) {
                        dayCell.appendChild(badgeContainer);
                    }
                    
                    // Click vào vùng trống để mở modal duyệt nghỉ phép (admin) hoặc đăng ký nghỉ phép (bác sĩ). Tab đăng ký: không cho click vào ngày quá khứ.
                    const isPastAndHide = (typeof hidePastDayMonth !== 'undefined' ? hidePastDayMonth : hidePastDay);
                    if (!isPastAndHide) {
                        dayCell.style.cursor = 'pointer';
                        dayCell.onclick = (e) => {
                            if (e.target === dayCell || e.target === dayLabel) {
                                clickHandler(date);
                            }
                        };
                    }
                    grid.appendChild(dayCell);
                } else {
                    // Calendar thường (cho user đăng ký nghỉ phép)
                const btn = document.createElement('button');
                    // Nếu là ngày hiện tại, đóng khung xanh
                    if (isToday) {
                        btn.style.border = '3px solid #3498db';
                    } else {
                btn.style.border = '1px solid #e6e9ef';
                    }
                btn.style.borderRadius = '6px';
                btn.style.padding = '12px';
                btn.style.background = '#f8fafc';
                btn.style.cursor = 'pointer';
                btn.style.minHeight = '64px';
                btn.style.fontSize = '16px';
                btn.style.position = 'relative';
                btn.textContent = d;

                // show indicators for requests on this date and color by status
                const subs = submissions.filter(s => s.date === key);
                const count = subs.length;
                const approvedSubs = subs.filter(s => s.status === 'approved');
                const pendingSubs = subs.filter(s => s.status === 'pending');
                const rejectedSubs = subs.filter(s => s.status === 'rejected');
                const approvedCount = approvedSubs.length;
                const pendingCount = pendingSubs.length;
                const rejectedCount = rejectedSubs.length;
                const hasApproved = approvedCount > 0;
                const hasPending = pendingCount > 0;
                const hasRejected = rejectedCount > 0;

                    // Nếu là ngày hiện tại, ưu tiên hiển thị viền xanh
                    if (isToday) {
                        btn.style.border = '3px solid #3498db';
                    }

                if (hasApproved) {
                    btn.style.background = '#e9f9ee';
                        if (!isToday) {
                    btn.style.borderColor = '#27ae60';
                        }
                } else if (hasPending) {
                    btn.style.background = '#fff8e6';
                        if (!isToday) {
                    btn.style.borderColor = '#f39c12';
                        }
                } else if (hasRejected) {
                    btn.style.background = '#fff0f0';
                        if (!isToday) {
                    btn.style.borderColor = '#e74c3c';
                        }
                }

                // Tạo tooltip cho ô ngày
                const tooltipParts = [];
                if (approvedCount > 0) tooltipParts.push(`✅ ${approvedCount} đã duyệt`);
                if (pendingCount > 0) tooltipParts.push(`⏳ ${pendingCount} chờ duyệt`);
                if (rejectedCount > 0) tooltipParts.push(`❌ ${rejectedCount} từ chối`);
                if (tooltipParts.length > 0) {
                    btn.title = tooltipParts.join(' | ');
                }

                // Hiển thị badge theo từng loại trạng thái
                const badgeContainer = document.createElement('div');
                badgeContainer.style.position = 'absolute';
                badgeContainer.style.top = '6px';
                badgeContainer.style.right = '6px';
                badgeContainer.style.display = 'flex';
                badgeContainer.style.gap = '4px';
                badgeContainer.style.flexDirection = 'row-reverse';
                
                // Badge đã duyệt (xanh)
                if (hasApproved) {
                    const badge = document.createElement('div');
                    badge.textContent = approvedCount;
                    badge.style.background = '#27ae60';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `✅ ${approvedCount} yêu cầu đã duyệt`;
                    badgeContainer.appendChild(badge);
                }
                
                // Badge chờ duyệt (vàng)
                if (hasPending) {
                    const badge = document.createElement('div');
                    badge.textContent = pendingCount;
                    badge.style.background = '#f39c12';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `⏳ ${pendingCount} yêu cầu chờ duyệt`;
                    badgeContainer.appendChild(badge);
                }
                
                // Badge từ chối (đỏ)
                if (hasRejected) {
                    const badge = document.createElement('div');
                    badge.textContent = rejectedCount;
                    badge.style.background = '#e74c3c';
                    badge.style.color = '#fff';
                    badge.style.borderRadius = '10px';
                    badge.style.padding = '2px 6px';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.minWidth = '20px';
                    badge.style.textAlign = 'center';
                    badge.title = `❌ ${rejectedCount} yêu cầu từ chối`;
                    badgeContainer.appendChild(badge);
                }
                
                if (badgeContainer.children.length > 0) {
                    btn.appendChild(badgeContainer);
                }

                // disable past dates (cannot request before today)
                const today = new Date();
                const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                const dateKey = key;
                // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
                if (dateKey < todayKey) {
                    btn.style.opacity = '0.45';
                    btn.style.cursor = 'default';
                    btn.disabled = true;
                } else {
                    btn.onclick = () => clickHandler(date);
                }
                grid.appendChild(btn);
                }
            }

            month.appendChild(grid);
            return month;
        }

        // Open request modal when user clicks a date
        function onUserDateClick(date) {
            if (!currentUser) { alert('Vui lòng đăng nhập'); return; }
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
            if (dateKey < todayKey) { alert('Không thể đăng ký cho ngày trước ngày hiện tại'); return; }
            const key = dateKey;
            document.getElementById('requestDateDisplay').textContent = key;
            document.getElementById('requestDoctorName').textContent = currentUser.name || currentUser.username;
            document.getElementById('requestNotes').value = '';
            document.getElementById('requestModal').classList.add('active');
            // store selected date
            document.getElementById('requestForm').dataset.date = key;
        }

        function closeRequestModal() { document.getElementById('requestModal').classList.remove('active'); }

        // Đăng ký nghỉ cả tháng (mặc định nghỉ cả ngày)
        function getMonthDates(year, month) {
            const dates = [];
            const lastDay = new Date(year, month, 0).getDate();
            for (let day = 1; day <= lastDay; day++) {
                dates.push(year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'));
            }
            return dates;
        }
        function openBatchLeaveModalForMonth(monthNum, year) {
            openBatchLeaveModal(monthNum, year);
        }
        function openBatchLeaveModal(monthNum, year) {
            if (!currentUser) { alert('Vui lòng đăng nhập'); return; }
            if (typeof canRegisterOwnLeave === 'function' && !canRegisterOwnLeave()) { alert('Bạn không có quyền đăng ký nghỉ phép.'); return; }
            const titleEl = document.getElementById('batchLeaveModalTitle');
            const descEl = document.getElementById('batchLeaveModalDesc');
            const monthFields = document.getElementById('batchLeaveMonthFields');
            const monthSelect = document.getElementById('batchLeaveMonth');
            const yearSelect = document.getElementById('batchLeaveYear');
            if (!titleEl || !monthFields) return;
            titleEl.textContent = '📆 Đăng ký nghỉ cả tháng';
            descEl.textContent = 'Chọn tháng, đăng ký nghỉ cả ngày cho tất cả các ngày trong tháng.';
            monthFields.style.display = 'block';
            const now = new Date();
            if (yearSelect) {
                yearSelect.innerHTML = '';
                for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    if (y === (year != null ? year : now.getFullYear())) opt.selected = true;
                    yearSelect.appendChild(opt);
                }
            }
            if (monthSelect) {
                monthSelect.innerHTML = '';
                for (let m = 1; m <= 12; m++) {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = 'Tháng ' + m;
                    if (m === (monthNum != null ? monthNum : now.getMonth() + 1)) opt.selected = true;
                    monthSelect.appendChild(opt);
                }
            }
            const batchAdminWrap = document.getElementById('batchLeaveAdminDoctorWrap');
            const batchAdminSel = document.getElementById('batchLeaveAdminDoctorSelect');
            if (currentUser.role === 'admin' && batchAdminWrap && batchAdminSel) {
                batchAdminWrap.style.display = 'block';
                batchAdminSel.innerHTML = '';
                const doctorsList = typeof getAllDoctorsForLeaveDropdown === 'function' ? getAllDoctorsForLeaveDropdown() : [];
                doctorsList.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.key;
                    opt.textContent = d.name;
                    batchAdminSel.appendChild(opt);
                });
            } else if (batchAdminWrap) {
                batchAdminWrap.style.display = 'none';
            }
            document.getElementById('batchLeaveModal').classList.add('active');
        }
        function closeBatchLeaveModal() {
            document.getElementById('batchLeaveModal').classList.remove('active');
        }
        function submitBatchLeaveRequest() {
            if (!currentUser) return;
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            let docKey, docName;
            const batchAdminSel = document.getElementById('batchLeaveAdminDoctorSelect');
            if (currentUser.role === 'admin' && batchAdminSel && batchAdminSel.options.length > 0 && batchAdminSel.value) {
                docKey = batchAdminSel.value;
                docName = batchAdminSel.options[batchAdminSel.selectedIndex].textContent;
            } else {
                docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
                docName = currentUser.name || currentUser.username;
            }
            const yearSelect = document.getElementById('batchLeaveYear');
            const monthSelect = document.getElementById('batchLeaveMonth');
            const y = parseInt(yearSelect?.value || today.getFullYear(), 10);
            const m = parseInt(monthSelect?.value || (today.getMonth() + 1), 10);
            const dates = getMonthDates(y, m);
            const existingSet = new Set();
            submissions.forEach(function (s) {
                if ((s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.period === 'full') {
                    existingSet.add(s.date);
                }
            });
            let added = 0;
            const baseId = Date.now();
            dates.forEach(function (dateStr) {
                if (dateStr < todayKey) return;
                if (existingSet.has(dateStr)) return;
                const submission = {
                    id: baseId + added,
                    doctorKey: docKey,
                    doctorName: docName,
                    date: dateStr,
                    period: 'full',
                    notes: '',
                    status: 'pending',
                    submitDate: new Date().toISOString()
                };
                submissions.push(submission);
                existingSet.add(dateStr);
                added++;
            });
            StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeBatchLeaveModal();
            if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars();
            if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
            updateNotifCount();
            if (typeof updateLeaveRequestListBadge === 'function') updateLeaveRequestListBadge();
            alert('✅ Đã gửi ' + added + ' yêu cầu nghỉ cả ngày. Đang chờ admin duyệt.');
        }

        function submitLeaveRequest(e) {
            e.preventDefault();
            const form = document.getElementById('requestForm');
            const date = form.dataset.date;
            const period = form.querySelector('input[name="period"]:checked')?.value;
            const notes = document.getElementById('requestNotes').value.trim();
            const err = document.getElementById('requestError');
            err.style.display = 'none';
            if (!period) { err.textContent = 'Vui lòng chọn loại (sáng/chiều/cả ngày)'; err.style.display = 'block'; return; }

            let docKey, docName;
            const adminSel = document.getElementById('requestAdminDoctorSelect');
            if (currentUser.role === 'admin' && adminSel && adminSel.options.length > 0 && adminSel.value) {
                docKey = adminSel.value;
                docName = adminSel.options[adminSel.selectedIndex].textContent;
            } else {
                docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
                docName = currentUser.name || currentUser.username;
            }
            var existing = submissions.some(function (s) {
                return (s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.date === date && s.period === period;
            });
            if (existing) {
                err.textContent = 'Đã có yêu cầu nghỉ phép trùng ngày và trùng buổi cho bác sĩ này. Không thể tạo thêm.';
                err.style.display = 'block';
                return;
            }
            const submission = {
                id: Date.now(),
                doctorKey: docKey,
                doctorName: docName,
                date: date,
                period: period,
                notes: notes,
                status: 'pending',
                submitDate: new Date().toISOString()
            };
            submissions.push(submission);
            StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeRequestModal();
            // Render lại calendar cho tab Đăng ký nghỉ phép
            if (typeof renderNghiPhepCalendars === 'function') {
                renderNghiPhepCalendars();
            }
            // Render lại admin calendar nếu đang ở tab quản lý nghỉ phép
            if (typeof renderAdminCalendars === 'function') {
                renderAdminCalendars();
            }
            // Cập nhật số thông báo cho admin và bác sĩ có quyền duyệt
            updateNotifCount();
            // Cập nhật badge trên nút danh sách duyệt nghỉ phép
            updateLeaveRequestListBadge();
            alert('✅ Yêu cầu đã gửi, đang chờ admin duyệt.');
        }

        function quickRegisterLeaveForDate(dateStr) {
            if (!currentUser) { alert('Vui lòng đăng nhập'); return; }
            if (typeof canRegisterOwnLeave === 'function' && !canRegisterOwnLeave()) { alert('Bạn không có quyền đăng ký nghỉ phép.'); return; }
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) { alert('Không thể đăng ký cho ngày đã qua.'); return; }
            const docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
            const docName = currentUser.name || currentUser.username;
            const existing = submissions.some(s => (s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.date === dateStr && s.period === 'full');
            if (existing) { alert('Bạn đã đăng ký nghỉ cả ngày cho ngày này.'); return; }
            submissions.push({ id: Date.now(), doctorKey: docKey, doctorName: docName, date: dateStr, period: 'full', notes: '', status: 'pending', submitDate: new Date().toISOString() });
            StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars();
            if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
            updateNotifCount();
            if (typeof updateLeaveRequestListBadge === 'function') updateLeaveRequestListBadge();
        }
        function cancelMyPendingForDate(dateStr) {
            if (!currentUser) return;
            const docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
            const before = submissions.length;
            submissions = submissions.filter(s => !((s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.date === dateStr && s.status === 'pending'));
            if (submissions.length < before) {
                StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars();
                if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
                updateNotifCount();
                if (typeof updateLeaveRequestListBadge === 'function') updateLeaveRequestListBadge();
            }
        }
        function getMondayOfWeekForLeave(d) {
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const monday = new Date(d);
            monday.setDate(d.getDate() + diff);
            return monday;
        }
        function cancelMyPendingForWeek(weekStartDate) {
            if (!currentUser) return;
            const monday = weekStartDate instanceof Date ? weekStartDate : new Date(weekStartDate + 'T12:00:00');
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                cancelMyPendingForDate(key);
            }
            if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars();
            if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
            alert('✅ Đã hủy đăng ký nghỉ phép chờ duyệt cho cả tuần.');
        }
        function cancelMyPendingForMonth(cycleStart, cycleEnd) {
            if (!currentUser) return;
            const start = cycleStart instanceof Date ? new Date(cycleStart) : new Date(cycleStart + 'T12:00:00');
            const end = cycleEnd instanceof Date ? new Date(cycleEnd) : new Date(cycleEnd + 'T12:00:00');
            let d = new Date(start);
            while (d <= end) {
                const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                cancelMyPendingForDate(key);
                d.setDate(d.getDate() + 1);
            }
            if (typeof renderNghiPhepCalendars === 'function') renderNghiPhepCalendars();
            if (typeof renderAdminCalendars === 'function') renderAdminCalendars();
            alert('✅ Đã hủy đăng ký nghỉ phép chờ duyệt cho cả tháng.');
        }
        function hasMyPendingForDate(dateStr) {
            if (!currentUser) return false;
            const docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
            return submissions.some(s => (s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.date === dateStr && s.status === 'pending');
        }
        function countMyPendingInRange(cycleStart, cycleEnd) {
            if (!currentUser) return 0;
            const docKey = currentUser.key || normalizeKey(currentUser.username || currentUser.name);
            const start = cycleStart instanceof Date ? new Date(cycleStart) : new Date(cycleStart + 'T12:00:00');
            const end = cycleEnd instanceof Date ? new Date(cycleEnd) : new Date(cycleEnd + 'T12:00:00');
            let count = 0;
            let d = new Date(start);
            while (d <= end) {
                const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                if (submissions.some(s => (s.doctorKey === docKey || normalizeKey(s.doctorName || '') === docKey) && s.date === key && s.status === 'pending')) count++;
                d.setDate(d.getDate() + 1);
            }
            return count;
        }

        // Trả về danh sách bác sĩ (key, name) đã gộp, dùng cho dropdown admin đăng ký nghỉ thay bác sĩ
        function getAllDoctorsForLeaveDropdown() {
            const seen = new Set();
            const list = [];
            const add = (arr) => {
                if (!arr || !Array.isArray(arr)) return;
                arr.forEach(doc => {
                    const name = (doc.name || doc.displayName || '').toString().trim();
                    if (!name) return;
                    const k = normalizeKey(name);
                    if (seen.has(k)) return;
                    seen.add(k);
                    list.push({ key: k, name: name });
                });
            };
            add(doctors.lanhdao);
            add(doctors.cot1);
            add(doctors.cot2);
            add(doctors.cot3);
            add(doctors.partime);
            add(doctors.khac);
            return list;
        }

        // Admin/Bác sĩ: clicking date opens review modal (admin) hoặc đăng ký nghỉ phép (bác sĩ)
        function onAdminDateClick(date, containerId) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            
            // Admin ở tab Đăng ký nghỉ phép: mở modal đăng ký và cho chọn bác sĩ để đăng ký thay
            if (currentUser && currentUser.role === 'admin' && containerId === 'nghiphepCalendarContainer') {
                if (key < todayKey) {
                    alert('Không thể đăng ký cho ngày trước ngày hiện tại');
                    return;
                }
                const wrap = document.getElementById('requestAdminDoctorWrap');
                const sel = document.getElementById('requestAdminDoctorSelect');
                const nameEl = document.getElementById('requestDoctorName');
                if (wrap && sel) {
                    wrap.style.display = 'block';
                    sel.innerHTML = '';
                    const doctorsList = getAllDoctorsForLeaveDropdown();
                    doctorsList.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.key;
                        opt.textContent = d.name;
                        sel.appendChild(opt);
                    });
                    sel.onchange = function() {
                        var o = sel.options[sel.selectedIndex];
                        nameEl.textContent = o ? o.textContent : '';
                    };
                    if (doctorsList.length > 0) {
                        sel.selectedIndex = 0;
                        nameEl.textContent = doctorsList[0].name;
                    } else nameEl.textContent = '';
                }
                document.getElementById('requestDateDisplay').textContent = key;
                document.getElementById('requestNotes').value = '';
                document.getElementById('requestModal').classList.add('active');
                document.getElementById('requestForm').dataset.date = key;
                return;
            }
            
            // Tài khoản cá nhân (bác sĩ) mặc định có quyền đăng ký nghỉ phép cho bản thân — không cần quyền quanlynghiphep_c1/c2/c3
            if (canRegisterOwnLeave() && currentUser.role !== 'admin') {
                // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
                if (key < todayKey) {
                    alert('Không thể đăng ký cho ngày trước ngày hiện tại');
                    return;
                }
                // Ẩn dropdown chọn bác sĩ (chỉ dùng cho admin)
                var adminWrap = document.getElementById('requestAdminDoctorWrap');
                if (adminWrap) adminWrap.style.display = 'none';
                // Mở modal đăng ký nghỉ phép
                document.getElementById('requestDateDisplay').textContent = key;
                document.getElementById('requestDoctorName').textContent = currentUser.name || currentUser.username;
                document.getElementById('requestNotes').value = '';
                document.getElementById('requestModal').classList.add('active');
                document.getElementById('requestForm').dataset.date = key;
                return;
            }
            
            // Admin: hiển thị danh sách yêu cầu chờ duyệt
            const list = submissions.filter(s => s.date === key && s.status === 'pending');
            const container = document.getElementById('adminReviewList');
            container.innerHTML = '';
            
            // Hiển thị tất cả yêu cầu (đã duyệt, đang chờ, bị từ chối)
            const allSubs = submissions.filter(s => s.date === key);
            const approvedList = allSubs.filter(s => s.status === 'approved');
            const rejectedList = allSubs.filter(s => s.status === 'rejected');
            
            if (list.length === 0 && approvedList.length === 0 && rejectedList.length === 0) {
                container.innerHTML = '<div class="empty-state">Không có yêu cầu nào cho ngày này</div>';
            } else {
                // Hiển thị yêu cầu đang chờ duyệt
                if (list.length > 0) {
                    const pendingHeader = document.createElement('div');
                    pendingHeader.style.marginBottom = '10px';
                    pendingHeader.style.padding = '10px';
                    pendingHeader.style.background = '#fff8e6';
                    pendingHeader.style.borderLeft = '4px solid #f39c12';
                    pendingHeader.style.borderRadius = '4px';
                    pendingHeader.innerHTML = '<strong style="color: #f39c12;">⏳ Yêu cầu đang chờ duyệt (' + list.length + ')</strong>';
                    container.appendChild(pendingHeader);
                    
                list.forEach(req => {
                    const el = document.createElement('div');
                    el.className = 'submission-item';
                        el.style.marginBottom = '10px';
                        
                        // Xác định cộtcủa bác sĩ
                        const doctorKey = req.doctorKey || normalizeKey(req.doctorName || '');
                        const doctorColumn = getDoctorColumn(doctorKey);
                        const hasPermission = doctorColumn ? hasPermissionForDuyetNghiPhepColumn(doctorColumn) : (currentUser && currentUser.role === 'admin');
                        
                        // Hiển thị thông tin cộtnếu có
                        let columnInfo = '';
                        if (doctorColumn) {
                            columnInfo = ` <span style="color: #666; font-size: 12px;">(${doctorColumn === 'ld' ? 'LĐ' : (doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3'))})</span>`;
                        }
                        
                        el.innerHTML = `<p><strong>${req.doctorName}</strong>${columnInfo} - ${req.period}</p><p>${req.notes||''}</p>`;
                        
                        // Chỉ hiển thị nút duyệt/từ chối nếu có quyền
                        if (hasPermission) {
                    const btnAccept = document.createElement('button');
                    btnAccept.className = 'submit-btn';
                    btnAccept.style.marginRight = '8px';
                    btnAccept.textContent = 'Chấp nhận';
                    btnAccept.onclick = () => adminDecide(req.id, 'approved');
                    const btnReject = document.createElement('button');
                    btnReject.className = 'delete-btn';
                    btnReject.textContent = 'Từ chối';
                    btnReject.onclick = () => adminDecide(req.id, 'rejected');
                    el.appendChild(btnAccept);
                    el.appendChild(btnReject);
                        } else {
                            const noPermissionMsg = document.createElement('div');
                            noPermissionMsg.style.color = '#e74c3c';
                            noPermissionMsg.style.fontSize = '14px';
                            noPermissionMsg.style.marginTop = '8px';
                            noPermissionMsg.textContent = '❌ Bạn không có quyền duyệt nghỉ phép cho ' + (doctorColumn === 'ld' ? 'Lãnh đạo' : (doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3')));
                            el.appendChild(noPermissionMsg);
                        }
                        
                    container.appendChild(el);
                });
                }
                
                // Hiển thị yêu cầu đã duyệt
                if (approvedList.length > 0) {
                    const approvedHeader = document.createElement('div');
                    approvedHeader.style.marginTop = '15px';
                    approvedHeader.style.marginBottom = '10px';
                    approvedHeader.style.padding = '10px';
                    approvedHeader.style.background = '#e9f9ee';
                    approvedHeader.style.borderLeft = '4px solid #27ae60';
                    approvedHeader.style.borderRadius = '4px';
                    approvedHeader.innerHTML = '<strong style="color: #27ae60;">✅ Đã duyệt (' + approvedList.length + ')</strong>';
                    container.appendChild(approvedHeader);
                    
                    approvedList.forEach(req => {
                        const el = document.createElement('div');
                        el.className = 'submission-item';
                        el.style.marginBottom = '10px';
                        el.style.opacity = '0.8';
                        el.innerHTML = `<p><strong>${req.doctorName}</strong> - ${req.period}</p><p>${req.notes||''}</p>`;
                        container.appendChild(el);
                    });
                }
                
                // Hiển thị yêu cầu bị từ chối
                if (rejectedList.length > 0) {
                    const rejectedHeader = document.createElement('div');
                    rejectedHeader.style.marginTop = '15px';
                    rejectedHeader.style.marginBottom = '10px';
                    rejectedHeader.style.padding = '10px';
                    rejectedHeader.style.background = '#fff0f0';
                    rejectedHeader.style.borderLeft = '4px solid #e74c3c';
                    rejectedHeader.style.borderRadius = '4px';
                    rejectedHeader.innerHTML = '<strong style="color: #e74c3c;">❌ Đã từ chối (' + rejectedList.length + ')</strong>';
                    container.appendChild(rejectedHeader);
                    
                    rejectedList.forEach(req => {
                        const el = document.createElement('div');
                        el.className = 'submission-item';
                        el.style.marginBottom = '10px';
                        el.style.opacity = '0.8';
                        el.innerHTML = `<p><strong>${req.doctorName}</strong> - ${req.period}</p><p>${req.notes||''}</p>`;
                        container.appendChild(el);
                    });
                }
            }
            
            // Thêm nút chỉnh sửa lịch nghỉ phép cho admin
            const actionsContainer = document.getElementById('adminReviewActions');
            if (actionsContainer && currentUser && currentUser.role === 'admin') {
                actionsContainer.innerHTML = '';
                const editBtn = document.createElement('button');
                editBtn.className = 'submit-btn';
                editBtn.style.width = '100%';
                editBtn.innerHTML = '✏️ Chỉnh sửa lịch nghỉ phép cho ngày này';
                editBtn.onclick = () => {
                    closeAdminReview();
                    openEditDayLeaveModal(date, key);
                };
                actionsContainer.appendChild(editBtn);
            }
            
            document.getElementById('adminReviewModal').classList.add('active');
        }

        function closeAdminReview() { document.getElementById('adminReviewModal').classList.remove('active'); renderAdminCalendars(); }

        function adminDecide(id, decision) {
            const idx = submissions.findIndex(s => s.id === id);
            if (idx === -1) return;
            
            const submission = submissions[idx];
            // Tìm doctorKey từ submission, ưu tiên doctorKey có sẵn
            let doctorKey = submission.doctorKey;
            let doctorColumn = null;
            
            // Nếu có doctorKey, thử tìm cột
            if (doctorKey) {
                doctorColumn = getDoctorColumn(doctorKey);
            }
            
            // Nếu không tìm thấy cột, thử tìm bằng doctorName
            if (!doctorColumn && submission.doctorName) {
                const submissionNameKey = normalizeKey(submission.doctorName || '');
                
                // Tìm trong tất cả các cột
                for (const col of ['ld', 'c1', 'c2', 'c3']) {
                    const doctorList = col === 'ld' ? doctors.lanhdao : (col === 'c1' ? doctors.cot1 : (col === 'c2' ? doctors.cot2 : doctors.cot3));
                    const found = doctorList.find(doc => {
                        const nameKey = normalizeKey(doc.name || '');
                        const displayNameKey = normalizeKey(doc.displayName || '');
                        // So sánh với cả name và displayName
                        return nameKey === submissionNameKey || displayNameKey === submissionNameKey;
                    });
                    
                    if (found) {
                        // Lấy key từ name (ưu tiên) hoặc displayName
                        doctorKey = normalizeKey(found.name || found.displayName || '');
                        doctorColumn = col;
                        // Cập nhật submission.doctorKey để lần sau không phải tìm lại
                        submission.doctorKey = doctorKey;
                        StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                        break;
                    }
                }
            }
            
            // Kiểm tra quyền duyệt theo cột
            if (doctorColumn && !hasPermissionForDuyetNghiPhepColumn(doctorColumn)) {
                alert('❌ Bạn không có quyền duyệt nghỉ phép cho ' + (doctorColumn === 'ld' ? 'Lãnh đạo' : (doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3'))) + '. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            submissions[idx].status = decision === 'approved' ? 'approved' : 'rejected';
            submissions[idx].decisionDate = new Date().toISOString();
            submissions[idx].decisionBy = currentUser.username || currentUser.name;
            StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);

            // Nếu duyệt chấp nhận, tự động thêm vào lịch nghỉ phép
            if (decision === 'approved' && doctorColumn) {
                const dateStr = submission.date;
                const period = submission.period || 'full'; // Lấy period từ submission, mặc định là 'full'
                
                // Đảm bảo dateStr được normalize (YYYY-MM-DD)
                const normalizeDateStr = (dateStr) => {
                    if (!dateStr) return '';
                    // Nếu đã là format YYYY-MM-DD, trả về nguyên
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        return dateStr;
                    }
                    // Nếu là format khác, cố gắng parse
                    try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            return d.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        // Ignore
                    }
                    return dateStr;
                };
                
                const normalizedDateStr = normalizeDateStr(dateStr);
                
                const dayData = quanlynghiphepData[normalizedDateStr] || { 
                    c1: { doctors: [], maxCount: 0 }, 
                    c2: { doctors: [], maxCount: 0 }, 
                    c3: { doctors: [], maxCount: 0 } 
                };
                
                // Lấy dữ liệu cột(format mới: object với doctors array)
                let columnData = dayData[doctorColumn];
                if (!columnData || typeof columnData !== 'object' || !Array.isArray(columnData.doctors)) {
                    columnData = { doctors: [], maxCount: columnData?.maxCount || 0 };
                }
                
                // Kiểm tra xem bác sĩ đã có trong danh sách chưa (format mới: object {key, period})
                const existingDoctorKeys = columnData.doctors
                    .filter(d => d && typeof d === 'object' && d.key)
                    .map(d => d.key);
                
                // Thêm bác sĩ vào danh sách nếu chưa có
                if (!existingDoctorKeys.includes(doctorKey)) {
                    // Thêm theo format mới: object có key và period
                    columnData.doctors.push({ key: doctorKey, period: period });
                    dayData[doctorColumn] = columnData;
                    quanlynghiphepData[normalizedDateStr] = dayData;
                    saveQuanLyNghiPhepData();
                    console.log('✅ Đã thêm bác sĩ vào lịch nghỉ phép:', doctorKey, 'ngày', normalizedDateStr, 'cột', doctorColumn);
                } else {
                    // Nếu đã có, cập nhật period nếu cần
                    const existingIndex = columnData.doctors.findIndex(d => 
                        d && typeof d === 'object' && d.key === doctorKey
                    );
                    
                    if (existingIndex !== -1) {
                        // Cập nhật period
                        columnData.doctors[existingIndex].period = period;
                        dayData[doctorColumn] = columnData;
                        quanlynghiphepData[normalizedDateStr] = dayData;
                        saveQuanLyNghiPhepData();
                        console.log('✅ Đã cập nhật period cho bác sĩ:', doctorKey, 'ngày', normalizedDateStr);
                    }
                }
            } else if (decision === 'approved' && !doctorColumn) {
                console.warn('⚠️ Không tìm thấy cộtcho bác sĩ:', doctorKey, 'submission:', submission);
            }

            // notify user
            const userKey = submission.doctorKey;
            if (accounts[userKey]) {
                accounts[userKey].notifications = accounts[userKey].notifications || [];
                accounts[userKey].notifications.push({
                    id: Date.now(),
                    date: submission.date,
                    period: submission.period,
                    status: submission.status,
                    message: submission.status === 'approved' ? 'Yêu cầu nghỉ của bạn đã được chấp nhận' : 'Yêu cầu nghỉ của bạn đã bị từ chối',
                    time: new Date().toISOString(),
                    read: false
                });
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }

            alert('Đã xử lý yêu cầu.');
            closeAdminReview();
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            updateNotifCount();
            updateLeaveRequestListBadge();
        }

        // Mở modal chỉnh sửa lịch nghỉ phép cho ngày cụ thể
        function openEditDayLeaveModal(date, dateKey) {
            const modal = document.getElementById('editDayLeaveModal');
            if (!modal) return;
            
            // Hiển thị ngày
            const dateDisplay = document.getElementById('editDayLeaveDateDisplay');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            dateDisplay.textContent = `📅 Ngày ${dateStr} (${dateKey})`;
            
            // Lấy dữ liệu hiện tại cho ngày này
            const dayData = quanlynghiphepData[dateKey] || {
                ld: { doctors: [], maxCount: 0 },
                c1: { doctors: [], maxCount: 0 },
                c2: { doctors: [], maxCount: 0 },
                c3: { doctors: [], maxCount: 0 }
            };
            if (!dayData.ld) dayData.ld = { doctors: [], maxCount: 0 };
            
            // Lấy lịch nghỉ cố định từ fixedScheduleData để hiển thị
            const weekday = date.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
            const fixedWeekdayKey = weekday === 0 ? 7 : weekday; // Chuyển CN (0) thành 7
            
            const container = document.getElementById('editDayLeaveContent');
            container.innerHTML = '';
            
            const columns = [
                { key: 'ld', name: 'Lãnh đạo (LĐ)' },
                { key: 'c1', name: 'Cột 1' },
                { key: 'c2', name: 'Cột 2' },
                { key: 'c3', name: 'Cột 3' }
            ];
            
            columns.forEach(col => {
                const colDiv = document.createElement('div');
                colDiv.style.marginBottom = '30px';
                colDiv.style.padding = '15px';
                colDiv.style.border = '1px solid #ddd';
                colDiv.style.borderRadius = '8px';
                colDiv.style.background = '#f9f9f9';
                
                const colTitle = document.createElement('h3');
                colTitle.style.marginTop = '0';
                colTitle.style.marginBottom = '15px';
                colTitle.style.color = '#333';
                colTitle.textContent = col.name;
                colDiv.appendChild(colTitle);
                
                // Lấy danh sách bác sĩ trong cột này
                const doctorList = col.key === 'ld' ? doctors.lanhdao : (col.key === 'c1' ? doctors.cot1 : (col.key === 'c2' ? doctors.cot2 : doctors.cot3));
                
                // Lấy danh sách bác sĩ đã chọn (từ quanlynghiphepData)
                const selectedDoctors = dayData[col.key]?.doctors || [];
                const selectedDoctorKeys = selectedDoctors.map(d => 
                    d && typeof d === 'object' ? d.key : d
                );
                
                // Lấy lịch nghỉ cố định cho thứ này
                const fixedDoctors = [];
                if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                    const fixedSchedule = getFixedScheduleForWeekday(col.key, fixedWeekdayKey);
                    fixedDoctors.push(...fixedSchedule);
                }
                
                // Tạo checkbox cho mỗi bác sĩ
                doctorList.forEach(doc => {
                    const doctorKey = normalizeKey(doc.name || doc.displayName || '');
                    const doctorDisplayName = doc.displayName || doc.name || '';
                    
                    // Kiểm tra xem bác sĩ có trong danh sách đã chọn không
                    const selectedDoctor = selectedDoctors.find(d => {
                        const dKey = d && typeof d === 'object' ? d.key : d;
                        return dKey === doctorKey;
                    });
                    const isSelected = !!selectedDoctor;
                    const currentPeriod = selectedDoctor && typeof selectedDoctor === 'object' 
                        ? selectedDoctor.period 
                        : 'full';
                    
                    // Kiểm tra xem có trong lịch nghỉ cố định không
                    const isFixed = fixedDoctors.some(fd => {
                        const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                        return fdKey === doctorKey;
                    });
                    
                    const doctorDiv = document.createElement('div');
                    doctorDiv.style.marginBottom = '12px';
                    doctorDiv.style.padding = '10px';
                    doctorDiv.style.background = isSelected ? '#e8f5e9' : '#fff';
                    doctorDiv.style.border = isSelected ? '2px solid #4CAF50' : '1px solid #ddd';
                    doctorDiv.style.borderRadius = '5px';
                    
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.flexDirection = 'column';
                    label.style.cursor = 'pointer';
                    label.style.gap = '8px';
                    
                    const firstRow = document.createElement('div');
                    firstRow.style.display = 'flex';
                    firstRow.style.alignItems = 'center';
                    firstRow.style.gap = '10px';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = doctorKey;
                    checkbox.checked = isSelected;
                    checkbox.id = `editDayLeave_${col.key}_${doctorKey}`;
                    checkbox.onchange = () => {
                        const periodRow = document.getElementById(`editDayLeavePeriod_${col.key}_${doctorKey}`);
                        if (periodRow) {
                            periodRow.style.display = checkbox.checked ? 'flex' : 'none';
                            periodRow.querySelectorAll('input[type="radio"]').forEach(radio => {
                                radio.disabled = !checkbox.checked;
                            });
                            if (!checkbox.checked) {
                                const fullRadio = periodRow.querySelector('input[value="full"]');
                                if (fullRadio) fullRadio.checked = true;
                            }
                        }
                        // Cập nhật màu nền
                        doctorDiv.style.background = checkbox.checked ? '#e8f5e9' : '#fff';
                        doctorDiv.style.border = checkbox.checked ? '2px solid #4CAF50' : '1px solid #ddd';
                    };
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.style.fontWeight = '600';
                    nameSpan.textContent = doctorDisplayName;
                    if (isFixed) {
                        const fixedBadge = document.createElement('span');
                        fixedBadge.textContent = ' (Cố định)';
                        fixedBadge.style.color = '#666';
                        fixedBadge.style.fontSize = '12px';
                        fixedBadge.style.fontWeight = 'normal';
                        nameSpan.appendChild(fixedBadge);
                    }
                    
                    firstRow.appendChild(checkbox);
                    firstRow.appendChild(nameSpan);
                    
                    const secondRow = document.createElement('div');
                    secondRow.id = `editDayLeavePeriod_${col.key}_${doctorKey}`;
                    secondRow.style.display = isSelected ? 'flex' : 'none';
                    secondRow.style.gap = '15px';
                    secondRow.style.marginLeft = '28px';
                    secondRow.style.fontSize = '13px';
                    
                    const periods = [
                        { value: 'morning', label: 'Nghỉ sáng' },
                        { value: 'afternoon', label: 'Nghỉ chiều' },
                        { value: 'full', label: 'Nghỉ cả ngày' }
                    ];
                    
                    periods.forEach(period => {
                        const periodLabel = document.createElement('label');
                        periodLabel.style.display = 'flex';
                        periodLabel.style.alignItems = 'center';
                        periodLabel.style.cursor = 'pointer';
                        periodLabel.style.gap = '4px';
                        
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = `editDayLeavePeriod_${col.key}_${doctorKey}`;
                        radio.value = period.value;
                        radio.checked = currentPeriod === period.value;
                        radio.disabled = !isSelected;
                        
                        periodLabel.appendChild(radio);
                        periodLabel.appendChild(document.createTextNode(period.label));
                        secondRow.appendChild(periodLabel);
                    });
                    
                    label.appendChild(firstRow);
                    label.appendChild(secondRow);
                    doctorDiv.appendChild(label);
                    colDiv.appendChild(doctorDiv);
                });
                
                container.appendChild(colDiv);
            });
            
            // Lưu dateKey vào modal để dùng khi lưu
            modal.dataset.dateKey = dateKey;
            modal.classList.add('active');
        }
        
        // Đóng modal chỉnh sửa lịch nghỉ phép
        function closeEditDayLeaveModal() {
            const modal = document.getElementById('editDayLeaveModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Lưu lịch nghỉ phép cho ngày cụ thể
        function saveDayLeaveSchedule() {
            const modal = document.getElementById('editDayLeaveModal');
            if (!modal) return;
            
            const dateKey = modal.dataset.dateKey;
            if (!dateKey) return;
            
            // Kiểm tra quyền admin
            if (!currentUser || currentUser.role !== 'admin') {
                alert('❌ Chỉ admin mới có quyền chỉnh sửa lịch nghỉ phép.');
                return;
            }
            
            const columns = ['ld', 'c1', 'c2', 'c3'];
            const newDayData = {
                ld: { doctors: [], maxCount: 0 },
                c1: { doctors: [], maxCount: 0 },
                c2: { doctors: [], maxCount: 0 },
                c3: { doctors: [], maxCount: 0 }
            };
            
            columns.forEach(col => {
                const checkboxes = document.querySelectorAll(
                    `#editDayLeaveContent input[type="checkbox"][id^="editDayLeave_${col}_"]:checked`
                );
                
                const selectedDoctors = [];
                checkboxes.forEach(checkbox => {
                    const doctorKey = checkbox.value;
                    const periodRadio = document.querySelector(
                        `input[name="editDayLeavePeriod_${col}_${doctorKey}"]:checked`
                    );
                    const period = periodRadio ? periodRadio.value : 'full';
                    selectedDoctors.push({ key: doctorKey, period: period });
                });
                
                newDayData[col].doctors = selectedDoctors;
            });
            
            // Lưu vào quanlynghiphepData
            quanlynghiphepData[dateKey] = newDayData;
            saveQuanLyNghiPhepData();
            
            // Render lại calendar
            renderAdminCalendars();
            
            // Đóng modal
            closeEditDayLeaveModal();
            
            alert('✅ Đã lưu lịch nghỉ phép cho ngày ' + dateKey);
        }
        
        function renderAdminCalendars() { renderThreeMonthCalendars('adminCalendarContainer', onAdminDateClick, { numCycles: 5, titleFormat: 'month' }); }
        
        // Render calendar cho tab Đăng ký nghỉ phép (hiển thị giống admin nhưng vẫn có tính năng xin nghỉ phép)
        function renderNghiPhepCalendars() { renderThreeMonthCalendars('nghiphepCalendarContainer', onAdminDateClick, { numCycles: 5, titleFormat: 'month', showMonthBatchButton: true }); }
        
        // ========== Tab Lịch Trực ==========
        // Lấy LĐ từ lịch trực thường trú theo ngày (map weekday)
        function getLĐFromTructhuongtru(dateKey) {
            try {
                const d = new Date(dateKey + 'T00:00:00');
                const wd = d.getDay(); // 0=CN, 1=T2, ..., 6=T7
                const keyMap = { 0: 'cn', 1: 'thu2', 2: 'thu3', 3: 'thu4', 4: 'thu5', 5: 'thu6', 6: 'thu7' };
                return (tructhuongtruData[keyMap[wd]] || '').trim() || '-';
            } catch (e) { return '-'; }
        }
        // Lấy danh sách bác sĩ nghỉ phép trong ngày (để loại trừ khi chọn trực ngày)
        function getDoctorsOnLeaveForDate(dateKey) {
            const keys = new Set();
            const dayData = quanlynghiphepData[dateKey] || {};
            const fixedDateObj = new Date(dateKey + 'T00:00:00');
            const wd = fixedDateObj.getDay();
            const wdKey = wd === 0 ? 7 : wd;
            ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                const saved = dayData[col];
                const hasSaved = saved && typeof saved === 'object' && Array.isArray(saved.doctors);
                if (hasSaved) {
                    (saved.doctors || []).forEach(item => {
                        const k = item && typeof item === 'object' ? item.key : item;
                        if (k) keys.add(k);
                    });
                } else if (wdKey >= 1 && wdKey <= 6) {
                    const fixed = getFixedScheduleForWeekday(col, wdKey);
                    fixed.forEach(f => { const k = f && typeof f === 'object' ? f.key : f; if (k) keys.add(k); });
                }
            });
            submissions.filter(s => s.date === dateKey && (s.status === 'approved' || s.status === 'pending')).forEach(s => {
                keys.add(normalizeKey(s.doctorName || ''));
            });
            return keys;
        }
        // Lấy danh sách bác sĩ nghỉ phép theo buổi (sáng/chiều/full) cho 1 ngày – dùng cho lịch có chia ca
        function getDoctorsOnLeaveForDateAndPeriod(dateKey, period) {
            const keys = new Set();
            const dayData = quanlynghiphepData[dateKey] || {};
            const fixedDateObj = new Date(dateKey + 'T00:00:00');
            const wd = fixedDateObj.getDay();
            const wdKey = wd === 0 ? 7 : wd;
            ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                const saved = dayData[col];
                const hasSaved = saved && typeof saved === 'object' && Array.isArray(saved.doctors);
                if (hasSaved) {
                    (saved.doctors || []).forEach(item => {
                        if (!item) return;
                        const k = typeof item === 'object' ? item.key : item;
                        const p = typeof item === 'object' ? (item.period || 'full') : 'full';
                        if (!k) return;
                        if (p === 'full' || p === period) keys.add(k);
                    });
                } else if (wdKey >= 1 && wdKey <= 6) {
                    // Lịch cố định theo thứ: coi như nghỉ cả ngày => cấm cả sáng/chiều
                    const fixed = getFixedScheduleForWeekday(col, wdKey);
                    fixed.forEach(f => { const k = f && typeof f === 'object' ? f.key : f; if (k) keys.add(k); });
                }
            });
            submissions
                .filter(s => s.date === dateKey && (s.status === 'approved' || s.status === 'pending'))
                .forEach(s => {
                    const k = normalizeKey(s.doctorName || '');
                    const p = s.period || 'full';
                    if (!k) return;
                    if (p === 'full' || p === period) keys.add(k);
                });
            return keys;
        }
        let lichTrucModalState = { dateKey: '', column: '', shift: '' };
        function getDoctorDisplayNameAnyColumn(doctorKey) {
            for (const col of ['c1', 'c2', 'c3']) {
                const name = getDoctorNameByKey(doctorKey, col);
                if (name) return name;
            }
            return '';
        }
        function getDoctorDisplayNameFromList(doctorKey, nameList) {
            if (!Array.isArray(nameList)) return '';
            const found = nameList.find(n => normalizeKey(n || '') === doctorKey);
            return found ? (found.displayName || found.name || found) : '';
        }
        function openSelectLichTrucDoctorModal(dateKey, column, shift) {
            if (!hasPermission('lichtruc') && currentUser?.role !== 'admin') return;
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateKey < todayKey) return;
            lichTrucModalState = { dateKey, column, shift };
            const colLabel = column === 'c1' ? 'Cột 1' : (column === 'c2' ? 'Cột 2' : (column === 'c3' ? 'Cột 3' : ''));
            const shiftLabel = shift === 'day' ? 'Trực ngày' : (shift === 'night' ? 'Trực đêm' : 'Bs Trực 16h30');
            document.getElementById('selectLichTrucDoctorModalTitle').textContent = colLabel ? `Chọn bác sĩ - ${colLabel} - ${shiftLabel}` : `Chọn bác sĩ - ${shiftLabel}`;
            const container = document.getElementById('selectLichTrucDoctorList');
            if (!container) return;
            container.innerHTML = '';
            const doctorList = (shift === 'truc1630') ? [...doctors.cot1, ...doctors.cot2, ...doctors.cot3].filter((d, i, arr) => arr.findIndex(x => normalizeKey(x.name || x.displayName) === normalizeKey(d.name || d.displayName)) === i) : (column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3));
            // Trực ngày và Bs Trực 16h30: không được chọn bác sĩ có trong danh sách nghỉ phép ngày hôm đó
            const excludeKeys = (shift === 'day' || shift === 'truc1630') ? getDoctorsOnLeaveForDate(dateKey) : new Set();
            if (excludeKeys.size > 0 && (shift === 'day' || shift === 'truc1630')) {
                const hint = document.createElement('p');
                hint.style.cssText = 'font-size:12px;color:#e74c3c;margin-bottom:12px;';
                hint.textContent = '⚠️ Bác sĩ nghỉ phép ngày hôm đó không hiển thị trong danh sách.';
                container.appendChild(hint);
            }
            const dayData = lichTrucData[dateKey] || {};
            const colData = column ? (dayData[column] || {}) : {};
            const currentKey = shift === 'truc1630' ? (dayData.truc1630 || dayData.c1?.truc1630 || dayData.c2?.truc1630 || dayData.c3?.truc1630 || '') : (colData[shift] || '');
            // Thêm option "Trống" để bỏ chọn
            const emptyDiv = document.createElement('div');
            emptyDiv.style.marginBottom = '8px';
            const emptyLabel = document.createElement('label');
            emptyLabel.style.cssText = 'display:flex;align-items:center;cursor:pointer;gap:8px;';
            const emptyCb = document.createElement('input');
            emptyCb.type = 'radio';
            emptyCb.name = 'lichtruc_doctor';
            emptyCb.value = '';
            emptyCb.checked = !currentKey;
            emptyLabel.appendChild(emptyCb);
            emptyLabel.appendChild(document.createTextNode('— Trống'));
            emptyDiv.appendChild(emptyLabel);
            container.appendChild(emptyDiv);
            doctorList.forEach(doc => {
                const key = normalizeKey(doc.name || doc.displayName || '');
                const name = doc.displayName || doc.name || '';
                if ((shift === 'day' || shift === 'truc1630') && excludeKeys.has(key)) return;
                const div = document.createElement('div');
                div.style.marginBottom = '8px';
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.cursor = 'pointer';
                label.style.gap = '8px';
                const cb = document.createElement('input');
                cb.type = 'radio';
                cb.name = 'lichtruc_doctor';
                cb.value = key;
                cb.checked = key === currentKey;
                label.appendChild(cb);
                label.appendChild(document.createTextNode(name));
                div.appendChild(label);
                container.appendChild(div);
            });
            document.getElementById('selectLichTrucDoctorModal').classList.add('active');
        }
        function closeSelectLichTrucDoctorModal() {
            document.getElementById('selectLichTrucDoctorModal').classList.remove('active');
        }
        function saveSelectedLichTrucDoctor() {
            const { dateKey, column, shift } = lichTrucModalState;
            const selected = document.querySelector('#selectLichTrucDoctorList input[name="lichtruc_doctor"]:checked');
            const value = selected ? selected.value : '';
            if (!lichTrucData[dateKey]) lichTrucData[dateKey] = {};
            if (shift === 'truc1630') {
                lichTrucData[dateKey].truc1630 = value;
                ['c1','c2','c3'].forEach(c => { if (lichTrucData[dateKey][c]) delete lichTrucData[dateKey][c].truc1630; });
            } else {
                if (!lichTrucData[dateKey][column]) lichTrucData[dateKey][column] = { day: '', night: '' };
                lichTrucData[dateKey][column][shift] = value;
            }
            StorageUtil.saveJson(STORAGE_KEYS.lichTrucData, lichTrucData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeSelectLichTrucDoctorModal();
            renderLichTrucCalendars();
        }
        function renderLichTrucCalendars() {
            const container = document.getElementById('lichtrucCalendarContainer');
            if (!container) return;
            container.innerHTML = '';
            const today = new Date();
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const hasEditPermission = hasPermission('lichtruc') || currentUser?.role === 'admin';
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.className = 'calendar-month-card';
                monthEl.style.cssText = 'flex:0 1 100%;width:100%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;';
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                const title = document.createElement('div');
                title.style.cssText = 'text-align:center;font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = `Lịch trực tháng ${monthNum} năm ${year}`;
                monthEl.appendChild(title);
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:10px;';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.cssText = 'text-align:center;font-size:14px;color:#666;';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });
                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) grid.appendChild(document.createElement('div'));
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const todayForCompare = new Date();
                const todayKey = todayForCompare.getFullYear() + '-' + String(todayForCompare.getMonth() + 1).padStart(2, '0') + '-' + String(todayForCompare.getDate()).padStart(2, '0');
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const isPastDate = key < todayKey;
                    const dayData = lichTrucData[key] || {};
                    const ldName = getLĐFromTructhuongtru(key);
                    const wd = date.getDay();
                    const isSaturday = wd === 6;
                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    dayCell.style.cssText = 'border:1px solid #e6e9ef;border-radius:6px;padding:8px;background:#f8fafc;min-height:160px;display:flex;flex-direction:column;gap:4px;';
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    if (isHoliday) { dayCell.style.background = '#d32f2f'; dayCell.style.color = '#fff'; }
                    if (isPastDate) {
                        dayCell.style.opacity = isHoliday ? '0.85' : '0.35';
                        if (!isHoliday) dayCell.style.background = '#e9ecef';
                        dayCell.style.pointerEvents = 'none';
                        dayCell.style.cursor = 'default';
                    }
                    const dayLabel = document.createElement('div');
                    dayLabel.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:4px;';
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayCell.appendChild(dayLabel);
                    const createRow = (label, val, col, sh) => {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;cursor:pointer;';
                        if (hasEditPermission && !isPastDate) row.style.cursor = 'pointer';
                        else row.style.cursor = 'default';
                        row.innerHTML = `<span style="font-weight:600;">${label}</span><span>${val || '-'}</span>`;
                        if (hasEditPermission && !isPastDate && (sh || col)) row.onclick = () => openSelectLichTrucDoctorModal(key, col, sh);
                        return row;
                    };
                    dayCell.appendChild(createRow('LĐ', ldName, null, null));
                    ['c1','c2','c3'].forEach(col => {
                        const cd = dayData[col] || {};
                        const dayName = cd.day ? getDoctorNameByKey(cd.day, col) : '';
                        const nightName = cd.night ? getDoctorNameByKey(cd.night, col) : '';
                        dayCell.appendChild(createRow('C' + col.slice(-1) + ' Ngày', dayName, col, 'day'));
                        dayCell.appendChild(createRow('C' + col.slice(-1) + ' Đêm', nightName, col, 'night'));
                    });
                    if (isSaturday) {
                        const t1630Key = dayData.truc1630 || (dayData.c1?.truc1630 || dayData.c2?.truc1630 || dayData.c3?.truc1630 || '');
                        const t1630 = t1630Key ? getDoctorDisplayNameAnyColumn(t1630Key) : '';
                        dayCell.appendChild(createRow('Bs Trực 16h30', t1630, null, 'truc1630'));
                    }
                    grid.appendChild(dayCell);
                });
                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        
        // Khởi tạo tab Lịch nghỉ phép
        function initLichNghiPhepTab() {
            // Đảm bảo currentUser đã được load
            if (!currentUser) {
                console.warn('initLichNghiPhepTab: currentUser chưa được khởi tạo');
                setTimeout(initLichNghiPhepTab, 100);
                return;
            }
            
            // Cập nhật mô tả
            const descElement = document.getElementById('lichnghiphepDescription');
            if (descElement) {
                if (currentUser.role === 'admin') {
                    descElement.textContent = 'Xem lịch nghỉ phép của từng bác sĩ theo từng ngày. Chọn bác sĩ ở dropdown phía trên để xem lịch của họ.';
                } else {
                    descElement.textContent = 'Xem lịch nghỉ phép của bạn theo từng ngày.';
                }
            }
            
            // Hiển thị dropdown chọn bác sĩ cho admin
            const selectorDiv = document.getElementById('lichnghiphepDoctorSelector');
            const selectElement = document.getElementById('selectedDoctorForSchedule');
            const container = document.getElementById('lichnghiphepCalendarContainer');
            
            if (!container) {
                console.error('Không tìm thấy container lichnghiphepCalendarContainer');
                return;
            }
            
            if (currentUser.role === 'admin') {
                // Admin: hiển thị dropdown và cho phép chọn bác sĩ
                if (selectorDiv) selectorDiv.style.display = 'block';
                if (selectElement) {
                    populateDoctorSelector(selectElement);
                    selectElement.onchange = function() {
                        const selectedDoctorKey = this.value;
                        if (selectedDoctorKey) {
                            renderLichNghiPhepCalendar(selectedDoctorKey);
                        } else {
                            container.innerHTML = '<p style="color: #666; padding: 20px;">Vui lòng chọn bác sĩ để xem lịch nghỉ phép.</p>';
                        }
                    };
                    
                    // Tự động chọn và hiển thị bác sĩ đầu tiên nếu có
                    setTimeout(() => {
                        if (selectElement.options.length > 1) {
                            selectElement.value = selectElement.options[1].value;
                            renderLichNghiPhepCalendar(selectElement.options[1].value);
                        } else {
                            container.innerHTML = '<p style="color: #666; padding: 20px;">Chưa có bác sĩ nào trong hệ thống.</p>';
                        }
                    }, 50);
                } else {
                    container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy dropdown chọn bác sĩ.</p>';
                }
            } else {
                // Bác sĩ: chỉ xem lịch của mình
                if (selectorDiv) selectorDiv.style.display = 'none';
                
                // Tìm doctorKey của bác sĩ hiện tại trong danh sách bác sĩ
                let doctorKey = null;
                const currentUserName = currentUser.name || currentUser.username || '';
                const currentUserKey = normalizeKey(currentUserName);
                
                // Tìm trong tất cả các nhóm bác sĩ
                ['cot1', 'cot2', 'cot3', 'partime', 'khac', 'lanhdao'].forEach(group => {
                    if (doctorKey) return; // Đã tìm thấy, không cần tìm tiếp
                    
                    const doctorList = doctors[group] || [];
                    const found = doctorList.find(doc => {
                        const docNameKey = normalizeKey(doc.name || '');
                        const docDisplayNameKey = normalizeKey(doc.displayName || '');
                        return docNameKey === currentUserKey || docDisplayNameKey === currentUserKey;
                    });
                    if (found) {
                        doctorKey = normalizeKey(found.name || found.displayName || '');
                    }
                });
                
                // Nếu không tìm thấy, thử dùng key từ currentUser
                if (!doctorKey && currentUserKey) {
                    doctorKey = currentUserKey;
                }
                
                // Nếu vẫn không tìm thấy, thử dùng currentUser.key nếu có
                if (!doctorKey && currentUser.key) {
                    doctorKey = currentUser.key;
                }
                
                if (doctorKey) {
                    renderLichNghiPhepCalendar(doctorKey);
                } else {
                    container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy thông tin bác sĩ của bạn. Tên đăng nhập: ' + currentUserName + '. Vui lòng liên hệ admin.</p>';
                }
            }
        }
        
        // Populate dropdown chọn bác sĩ (cho admin)
        function populateDoctorSelector(selectElement) {
            if (!selectElement) return;
            
            // Xóa các option cũ (trừ option đầu tiên)
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }
            
            // Lấy tất cả bác sĩ từ các cột
            const allDoctors = [];
            const doctorMap = new Map(); // Để tránh trùng lặp
            
            ['cot1', 'cot2', 'cot3', 'partime', 'khac', 'lanhdao'].forEach(group => {
                const doctorList = doctors[group] || [];
                doctorList.forEach(doc => {
                    const doctorKey = normalizeKey(doc.name || doc.displayName || '');
                    const doctorDisplayName = doc.displayName || doc.name || '';
                    
                    if (doctorKey && !doctorMap.has(doctorKey)) {
                        doctorMap.set(doctorKey, doctorDisplayName);
                        allDoctors.push({ key: doctorKey, name: doctorDisplayName });
                    }
                });
            });
            
            // Sắp xếp theo tên
            allDoctors.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            
            // Thêm vào dropdown
            allDoctors.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.key;
                option.textContent = doc.name;
                selectElement.appendChild(option);
            });
        }
        
        // Render calendar lịch nghỉ phép cho một bác sĩ cụ thể
        function renderLichNghiPhepCalendar(doctorKey) {
            const container = document.getElementById('lichnghiphepCalendarContainer');
            if (!container) return;
            
            if (!doctorKey) {
                container.innerHTML = '<p style="color: #666; padding: 20px;">Vui lòng chọn bác sĩ để xem lịch nghỉ phép.</p>';
                return;
            }
            
            // Lấy tên hiển thị của bác sĩ
            let doctorDisplayName = '';
            ['cot1', 'cot2', 'cot3', 'partime', 'khac', 'lanhdao'].forEach(group => {
                const doctorList = doctors[group] || [];
                const found = doctorList.find(doc => {
                    const key = normalizeKey(doc.name || doc.displayName || '');
                    return key === doctorKey;
                });
                if (found) {
                    doctorDisplayName = found.displayName || found.name || '';
                }
            });
            
            if (!doctorDisplayName) {
                container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy thông tin bác sĩ.</p>';
                return;
            }
            
            // Render calendar riêng cho lịch nghỉ phép cá nhân
            renderDoctorLeaveCalendar('lichnghiphepCalendarContainer', doctorKey, doctorDisplayName);
        }
        
        // Render calendar chỉ hiển thị lịch nghỉ phép của một bác sĩ cụ thể
        function renderDoctorLeaveCalendar(containerId, doctorKey, doctorDisplayName) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            
            const today = new Date();
            const numCycles = 5;
            
            // Tính toán chu kỳ đầu tiên chứa ngày hiện tại (từ ngày 25 đến ngày 24)
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderDoctorLeaveMonthCycle(cycleStart, cycleEnd, doctorKey, doctorDisplayName);
                container.appendChild(monthEl);
            }
        }
        
        // Render một chu kỳ tháng cho lịch nghỉ phép cá nhân
        function renderDoctorLeaveMonthCycle(cycleStart, cycleEnd, doctorKey, doctorDisplayName) {
            const month = document.createElement('div');
            month.style.flex = '0 1 100%';
            month.style.width = '100%';
            month.style.minWidth = '100%';
            month.style.maxWidth = '100%';
            month.style.background = '#fff';
            month.style.borderRadius = '10px';
            month.style.padding = '14px';
            month.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
            
            const title = document.createElement('div');
            title.style.textAlign = 'center';
            title.style.fontWeight = '700';
            title.style.marginBottom = '8px';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            title.textContent = `Lịch nghỉ phép của ${doctorDisplayName} - Tháng ${monthNum}/${year}`;
            month.appendChild(title);
            
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7,1fr)';
            grid.style.gap = '8px';
            
            // weekday headers
            const weekdays = ['T2','T3','T4','T5','T6','T7','CN'];
            weekdays.forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.textAlign = 'center';
                wEl.style.fontSize = '14px';
                wEl.style.color = '#666';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            
            // Tính toán offset cho ngày đầu tiên của chu kỳ
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            
            // empty slots
            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                grid.appendChild(empty);
            }
            
            // Tạo danh sách tất cả các ngày trong chu kỳ
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            const todayForCompare = new Date();
            const todayKey = todayForCompare.getFullYear() + '-' + String(todayForCompare.getMonth() + 1).padStart(2, '0') + '-' + String(todayForCompare.getDate()).padStart(2, '0');
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            // Render từng ngày
            for (const date of allDates) {
                const key = toLocalDateKey(date);
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && 
                                date.getMonth() === todayForCompare.getMonth() && 
                                date.getDate() === todayForCompare.getDate();
                
                const dayCell = document.createElement('div');
                const isHolidayLeave = typeof isHolidayCell === 'function' && isHolidayCell(key);
                if (isToday) {
                    dayCell.style.border = '3px solid #3498db';
                } else {
                    dayCell.style.border = '1px solid #e6e9ef';
                }
                dayCell.style.borderRadius = '6px';
                dayCell.style.padding = '8px';
                dayCell.style.background = isHolidayLeave ? '#d32f2f' : '#f8fafc';
                if (isHolidayLeave) dayCell.style.color = '#fff';
                dayCell.style.minHeight = '100px';
                dayCell.style.position = 'relative';
                dayCell.style.display = 'flex';
                dayCell.style.flexDirection = 'column';
                dayCell.style.gap = '4px';
                dayCell.style.width = '100%';
                dayCell.style.minWidth = '0';
                dayCell.style.maxWidth = '100%';
                dayCell.style.overflow = 'hidden';
                dayCell.style.wordWrap = 'break-word';
                
                // Ngày
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.fontSize = '13px';
                dayLabel.style.fontWeight = '600';
                dayLabel.style.marginBottom = '4px';
                dayCell.appendChild(dayLabel);
                if (isHolidayLeave) {
                    const hl = getHolidayDisplayLabel(key);
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.fontSize = '11px';
                        holidayBadge.style.marginBottom = '4px';
                        holidayBadge.style.fontWeight = '500';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                
                // Lấy lịch nghỉ phép của bác sĩ trong ngày này
                const dayData = quanlynghiphepData[key] || {
                    ld: { doctors: [], maxCount: 0 },
                    c1: { doctors: [], maxCount: 0 },
                    c2: { doctors: [], maxCount: 0 },
                    c3: { doctors: [], maxCount: 0 }
                };
                
                // Kiểm tra lịch nghỉ cố định
                const dateObj = new Date(key + 'T00:00:00');
                const weekday = dateObj.getDay();
                const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
                
                const leaveInfo = [];
                
                // Kiểm tra trong quanlynghiphepData
                ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                    const columnData = dayData[col] || { doctors: [], maxCount: 0 };
                    const doctorsList = columnData.doctors || [];
                    const found = doctorsList.find(d => {
                        const dKey = d && typeof d === 'object' ? d.key : d;
                        return dKey === doctorKey;
                    });
                    if (found) {
                        const period = found && typeof found === 'object' ? found.period : 'full';
                        leaveInfo.push({
                            column: col === 'ld' ? 'LĐ' : (col === 'c1' ? 'C1' : (col === 'c2' ? 'C2' : 'C3')),
                            period: period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày'),
                            isFixed: false
                        });
                    }
                });
                
                // Kiểm tra lịch nghỉ cố định
                if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                    ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                        const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                        const isInFixed = fixedDoctors.some(fd => {
                            const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                            return fdKey === doctorKey;
                        });
                        
                        if (isInFixed) {
                            const foundFixed = fixedDoctors.find(fd => {
                                const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                                return fdKey === doctorKey;
                            });
                            const period = foundFixed && typeof foundFixed === 'object' ? foundFixed.period : 'full';
                            const columnName = col === 'ld' ? 'LĐ' : (col === 'c1' ? 'C1' : (col === 'c2' ? 'C2' : 'C3'));
                            
                            // Chỉ thêm nếu chưa có (ưu tiên lịch nghỉ đã chọn thủ công)
                            if (!leaveInfo.some(info => info.column === columnName)) {
                                leaveInfo.push({
                                    column: columnName,
                                    period: period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày'),
                                    isFixed: true
                                });
                            }
                        }
                    });
                }
                
                // Hiển thị thông tin nghỉ phép
                if (leaveInfo.length > 0 && !isHolidayLeave) {
                    dayCell.style.background = '#e9f9ee';
                    dayCell.style.borderColor = '#27ae60';
                    
                    leaveInfo.forEach(info => {
                        const infoDiv = document.createElement('div');
                        infoDiv.style.fontSize = '12px';
                        infoDiv.style.padding = '4px 6px';
                        infoDiv.style.background = '#fff';
                        infoDiv.style.borderRadius = '4px';
                        infoDiv.style.border = '1px solid #27ae60';
                        const fixedLabel = info.isFixed ? ' (Cố định)' : '';
                        infoDiv.textContent = `${info.column}: Nghỉ ${info.period}${fixedLabel}`;
                        dayCell.appendChild(infoDiv);
                    });
                } else {
                    dayCell.style.opacity = '0.5';
                }
                
                // Click vào ngày để xem chi tiết
                dayCell.style.cursor = 'pointer';
                dayCell.onclick = () => {
                    showDoctorLeaveDetail(date, doctorKey, doctorDisplayName);
                };
                
                grid.appendChild(dayCell);
            }
            
            month.appendChild(grid);
            return month;
        }
        
        // Hiển thị chi tiết lịch nghỉ phép của bác sĩ trong một ngày
        function showDoctorLeaveDetail(date, doctorKey, doctorDisplayName) {
            const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            const dateStr = formatDateWithWeekday(date);
            
            // Tìm lịch nghỉ phép của bác sĩ trong ngày này
            const dayData = quanlynghiphepData[key] || {
                c1: { doctors: [], maxCount: 0 },
                c2: { doctors: [], maxCount: 0 },
                c3: { doctors: [], maxCount: 0 }
            };
            
            // Tìm bác sĩ trong các cột
            const leaveInfo = [];
            ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                const columnData = dayData[col] || { doctors: [], maxCount: 0 };
                const doctorsList = columnData.doctors || [];
                
                const found = doctorsList.find(d => {
                    const dKey = d && typeof d === 'object' ? d.key : d;
                    return dKey === doctorKey;
                });
                
                if (found) {
                    const period = found && typeof found === 'object' ? found.period : 'full';
                    const periodText = period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày');
                    leaveInfo.push({
                        column: col === 'c1' ? 'Cột 1' : (col === 'c2' ? 'Cột 2' : 'Cột 3'),
                        period: periodText
                    });
                }
            });
            
            // Kiểm tra lịch nghỉ cố định
            const dateObj = new Date(key + 'T00:00:00');
            const weekday = dateObj.getDay();
            const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
            
            if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                    const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                    const isInFixed = fixedDoctors.some(fd => {
                        const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                        return fdKey === doctorKey;
                    });
                    
                    if (isInFixed) {
                        const foundFixed = fixedDoctors.find(fd => {
                            const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                            return fdKey === doctorKey;
                        });
                        const period = foundFixed && typeof foundFixed === 'object' ? foundFixed.period : 'full';
                        const periodText = period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày');
                        
                        // Chỉ thêm nếu chưa có trong leaveInfo (ưu tiên lịch nghỉ đã chọn thủ công)
                        const columnName = col === 'c1' ? 'Cột 1' : (col === 'c2' ? 'Cột 2' : 'Cột 3');
                        if (!leaveInfo.some(info => info.column === columnName)) {
                            leaveInfo.push({
                                column: columnName,
                                period: periodText,
                                isFixed: true
                            });
                        }
                    }
                });
            }
            
            // Hiển thị modal hoặc alert
            if (leaveInfo.length > 0) {
                let message = `📅 Lịch nghỉ phép của ${doctorDisplayName}\n`;
                message += `Ngày: ${dateStr}\n\n`;
                leaveInfo.forEach(info => {
                    const fixedLabel = info.isFixed ? ' (Cố định)' : '';
                    message += `• ${info.column}: Nghỉ ${info.period}${fixedLabel}\n`;
                });
                alert(message);
            } else {
                alert(`📅 ${doctorDisplayName} không có lịch nghỉ phép vào ngày ${dateStr}`);
            }
        }
        
        // ========== NGÀY CÔNG LÀM VIỆC ==========
        
        // Tính số công chuẩn của một tháng (từ ngày 25 đến ngày 24 tháng sau)
        // Chủ nhật không tính công, Thứ 7 tính 0.5 công
        function calculateStandardWorkDays(cycleStart, cycleEnd) {
            let totalDays = 0;
            let currentDate = new Date(cycleStart);
            
            while (currentDate <= cycleEnd) {
                const weekday = currentDate.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
                
                if (weekday === 0) {
                    // Chủ nhật: không tính công
                    totalDays += 0;
                } else if (weekday === 6) {
                    // Thứ 7: tính 0.5 công
                    totalDays += 0.5;
                } else {
                    // Thứ 2-6: tính 1 công
                    totalDays += 1;
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return totalDays;
        }
        
        // Tính số công thực tế của một bác sĩ trong một tháng
        // Trừ đi nghỉ phép: nửa ngày = -0.5, cả ngày = -1
        function calculateActualWorkDays(cycleStart, cycleEnd, doctorKey) {
            const standardDays = calculateStandardWorkDays(cycleStart, cycleEnd);
            let leaveDays = 0;
            
            // Duyệt qua tất cả các ngày trong chu kỳ
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                const dateKey = currentDate.getFullYear() + '-' + 
                               String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(currentDate.getDate()).padStart(2, '0');
                
                // Kiểm tra nghỉ phép trong quanlynghiphepData
                const dayData = quanlynghiphepData[dateKey] || {
                    c1: { doctors: [], maxCount: 0 },
                    c2: { doctors: [], maxCount: 0 },
                    c3: { doctors: [], maxCount: 0 }
                };
                
                // Kiểm tra trong tất cả các cột
                ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                    const columnData = dayData[col] || { doctors: [] };
                    const doctorsList = columnData.doctors || [];
                    
                    const found = doctorsList.find(d => {
                        const dKey = d && typeof d === 'object' ? d.key : d;
                        return dKey === doctorKey;
                    });
                    
                    if (found) {
                        const period = found && typeof found === 'object' ? found.period : 'full';
                        if (period === 'full') {
                            leaveDays += 1; // Nghỉ cả ngày
                        } else if (period === 'morning' || period === 'afternoon') {
                            leaveDays += 0.5; // Nghỉ nửa ngày
                        }
                    }
                });
                
                // Kiểm tra lịch nghỉ cố định
                const weekday = currentDate.getDay();
                const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
                
                if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                    ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                        const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                        const isInFixed = fixedDoctors.some(fd => {
                            const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                            return fdKey === doctorKey;
                        });
                        
                        if (isInFixed) {
                            // Kiểm tra xem đã có trong quanlynghiphepData chưa (ưu tiên lịch nghỉ đã chọn thủ công)
                            const columnData = dayData[col] || { doctors: [] };
                            const doctorsList = columnData.doctors || [];
                            const alreadyCounted = doctorsList.some(d => {
                                const dKey = d && typeof d === 'object' ? d.key : d;
                                return dKey === doctorKey;
                            });
                            
                            if (!alreadyCounted) {
                                const foundFixed = fixedDoctors.find(fd => {
                                    const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                                    return fdKey === doctorKey;
                                });
                                const period = foundFixed && typeof foundFixed === 'object' ? foundFixed.period : 'full';
                                if (period === 'full') {
                                    leaveDays += 1;
                                } else if (period === 'morning' || period === 'afternoon') {
                                    leaveDays += 0.5;
                                }
                            }
                        }
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return standardDays - leaveDays;
        }
        
        // Khởi tạo tab Ngày công làm việc
        function initNgayCongTab() {
            // Đảm bảo currentUser đã được load
            if (!currentUser) {
                console.warn('initNgayCongTab: currentUser chưa được khởi tạo');
                setTimeout(initNgayCongTab, 100);
                return;
            }
            
            // Cập nhật mô tả
            const descElement = document.getElementById('ngaycongDescription');
            if (descElement) {
                if (currentUser.role === 'admin') {
                    descElement.textContent = 'Xem ngày công làm việc của từng bác sĩ theo từng ngày. Chọn bác sĩ ở dropdown phía trên để xem ngày công của họ.';
                } else {
                    descElement.textContent = 'Xem ngày công làm việc của bạn theo từng ngày.';
                }
            }
            
            // Hiển thị bảng quản lý ca làm việc cho admin
            const workShiftsManagement = document.getElementById('workShiftsManagement');
            if (workShiftsManagement && currentUser.role === 'admin') {
                workShiftsManagement.style.display = 'block';
                renderWorkShiftsTable();
                initWorkShiftModal();
            } else if (workShiftsManagement) {
                workShiftsManagement.style.display = 'none';
            }
            
            // Hiển thị dropdown chọn bác sĩ cho admin
            const selectorDiv = document.getElementById('ngaycongDoctorSelector');
            const selectElement = document.getElementById('selectedDoctorForWorkDays');
            const container = document.getElementById('ngaycongCalendarContainer');
            
            if (!container) {
                console.error('Không tìm thấy container ngaycongCalendarContainer');
                return;
            }
            
            if (currentUser.role === 'admin') {
                // Admin: hiển thị dropdown và cho phép chọn bác sĩ
                if (selectorDiv) selectorDiv.style.display = 'block';
                if (selectElement) {
                    populateDoctorSelector(selectElement);
                    selectElement.onchange = function() {
                        const selectedDoctorKey = this.value;
                        if (selectedDoctorKey) {
                            renderNgayCongCalendar(selectedDoctorKey);
                        } else {
                            container.innerHTML = '<p style="color: #666; padding: 20px;">Vui lòng chọn bác sĩ để xem ngày công.</p>';
                        }
                    };
                    
                    // Tự động chọn và hiển thị bác sĩ đầu tiên nếu có
                    setTimeout(() => {
                        if (selectElement.options.length > 1) {
                            selectElement.value = selectElement.options[1].value;
                            renderNgayCongCalendar(selectElement.options[1].value);
                        } else {
                            container.innerHTML = '<p style="color: #666; padding: 20px;">Chưa có bác sĩ nào trong hệ thống.</p>';
                        }
                    }, 50);
                } else {
                    container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy dropdown chọn bác sĩ.</p>';
                }
            } else {
                // Bác sĩ: chỉ xem ngày công của mình
                if (selectorDiv) selectorDiv.style.display = 'none';
                
                // Tìm doctorKey của bác sĩ hiện tại trong danh sách bác sĩ
                let doctorKey = null;
                const currentUserName = currentUser.name || currentUser.username || '';
                const currentUserKey = normalizeKey(currentUserName);
                
                // Tìm trong tất cả các nhóm bác sĩ
                ['cot1', 'cot2', 'cot3', 'partime', 'khac', 'lanhdao'].forEach(group => {
                    if (doctorKey) return; // Đã tìm thấy, không cần tìm tiếp
                    
                    const doctorList = doctors[group] || [];
                    const found = doctorList.find(doc => {
                        const docNameKey = normalizeKey(doc.name || '');
                        const docDisplayNameKey = normalizeKey(doc.displayName || '');
                        return docNameKey === currentUserKey || docDisplayNameKey === currentUserKey;
                    });
                    if (found) {
                        doctorKey = normalizeKey(found.name || found.displayName || '');
                    }
                });
                
                // Nếu không tìm thấy, thử dùng key từ currentUser
                if (!doctorKey && currentUserKey) {
                    doctorKey = currentUserKey;
                }
                
                // Nếu vẫn không tìm thấy, thử dùng currentUser.key nếu có
                if (!doctorKey && currentUser.key) {
                    doctorKey = currentUser.key;
                }
                
                if (doctorKey) {
                    renderNgayCongCalendar(doctorKey);
                } else {
                    container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy thông tin bác sĩ của bạn. Tên đăng nhập: ' + currentUserName + '. Vui lòng liên hệ admin.</p>';
                }
            }
        }
        
        // ========== QUẢN LÝ CA LÀM VIỆC ==========
        
        // Hiển thị bảng danh sách ca làm việc
        function renderWorkShiftsTable() {
            const tbody = document.getElementById('workShiftsTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!workShifts || workShifts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Chưa có ca làm việc nào. Nhấn "Thêm Ca Mới" để thêm ca.</td></tr>';
                return;
            }
            
            workShifts.forEach((shift, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #eee';
                
                // STT
                const sttCell = document.createElement('td');
                sttCell.style.padding = '12px';
                sttCell.textContent = index + 1;
                row.appendChild(sttCell);
                
                // Tên ca
                const nameCell = document.createElement('td');
                nameCell.style.padding = '12px';
                nameCell.style.fontWeight = '600';
                nameCell.textContent = shift.name;
                row.appendChild(nameCell);
                
                // Số công
                const valueCell = document.createElement('td');
                valueCell.style.padding = '12px';
                valueCell.textContent = shift.workValue.toFixed(1);
                row.appendChild(valueCell);
                
                // Thao tác
                const actionCell = document.createElement('td');
                actionCell.style.padding = '12px';
                actionCell.style.textAlign = 'center';
                
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️ Sửa';
                editBtn.className = 'add-btn';
                editBtn.style.padding = '6px 12px';
                editBtn.style.marginRight = '8px';
                editBtn.style.fontSize = '13px';
                editBtn.onclick = () => openWorkShiftModal(shift.id);
                actionCell.appendChild(editBtn);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️ Xóa';
                deleteBtn.className = 'cancel-btn';
                deleteBtn.style.padding = '6px 12px';
                deleteBtn.style.fontSize = '13px';
                deleteBtn.onclick = () => deleteWorkShift(shift.id);
                actionCell.appendChild(deleteBtn);
                
                row.appendChild(actionCell);
                tbody.appendChild(row);
            });
        }
        
        // Khởi tạo modal quản lý ca làm việc
        function initWorkShiftModal() {
            const modal = document.getElementById('workShiftModal');
            const addBtn = document.getElementById('addWorkShiftBtn');
            const closeBtn = document.getElementById('closeWorkShiftModal');
            const cancelBtn = document.getElementById('cancelWorkShiftBtn');
            const form = document.getElementById('workShiftForm');
            
            if (!modal || !addBtn || !form) return;
            
            // Mở modal thêm mới
            addBtn.onclick = () => openWorkShiftModal(null);
            
            // Đóng modal
            if (closeBtn) {
                closeBtn.onclick = () => closeWorkShiftModal();
            }
            if (cancelBtn) {
                cancelBtn.onclick = () => closeWorkShiftModal();
            }
            
            // Xử lý submit form
            form.onsubmit = (e) => {
                e.preventDefault();
                saveWorkShift();
            };
            
            // Đóng khi click outside
            window.onclick = (event) => {
                if (event.target === modal) {
                    closeWorkShiftModal();
                }
            };
        }
        
        // Mở modal thêm/sửa ca làm việc
        function openWorkShiftModal(shiftId) {
            const modal = document.getElementById('workShiftModal');
            const title = document.getElementById('workShiftModalTitle');
            const form = document.getElementById('workShiftForm');
            const nameInput = document.getElementById('workShiftName');
            const valueInput = document.getElementById('workShiftValue');
            const idInput = document.getElementById('workShiftId');
            
            if (!modal || !form || !nameInput || !valueInput || !idInput) return;
            
            if (shiftId) {
                // Sửa ca hiện có
                const shift = workShifts.find(s => s.id === shiftId);
                if (!shift) return;
                
                title.textContent = 'Sửa Ca Làm Việc';
                idInput.value = shift.id;
                nameInput.value = shift.name;
                valueInput.value = shift.workValue;
            } else {
                // Thêm ca mới
                title.textContent = 'Thêm Ca Làm Việc';
                idInput.value = '';
                nameInput.value = '';
                valueInput.value = '';
            }
            
            modal.style.display = 'block';
        }
        
        // Đóng modal ca làm việc
        function closeWorkShiftModal() {
            const modal = document.getElementById('workShiftModal');
            const form = document.getElementById('workShiftForm');
            
            if (modal) modal.style.display = 'none';
            if (form) form.reset();
        }
        
        // Lưu ca làm việc
        function saveWorkShift() {
            const idInput = document.getElementById('workShiftId');
            const nameInput = document.getElementById('workShiftName');
            const valueInput = document.getElementById('workShiftValue');
            
            if (!nameInput || !valueInput) return;
            
            const name = nameInput.value.trim();
            const value = parseFloat(valueInput.value);
            
            if (!name) {
                alert('Vui lòng nhập tên ca!');
                return;
            }
            
            if (isNaN(value) || value < 0) {
                alert('Vui lòng nhập số công hợp lệ!');
                return;
            }
            
            const shiftId = idInput.value ? parseInt(idInput.value) : null;
            
            if (shiftId) {
                // Sửa ca hiện có
                const index = workShifts.findIndex(s => s.id === shiftId);
                if (index !== -1) {
                    workShifts[index].name = name;
                    workShifts[index].workValue = value;
                }
            } else {
                // Thêm ca mới
                const newId = workShifts.length > 0 ? Math.max(...workShifts.map(s => s.id)) + 1 : 1;
                workShifts.push({
                    id: newId,
                    name: name,
                    workValue: value
                });
            }
            
            // Lưu vào localStorage
            StorageUtil.saveJson(STORAGE_KEYS.workShifts, workShifts);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            
            // Render lại bảng
            renderWorkShiftsTable();
            
            // Đóng modal
            closeWorkShiftModal();
            
            alert('✅ Đã lưu ca làm việc thành công!');
        }
        
        // Xóa ca làm việc
        function deleteWorkShift(shiftId) {
            if (!confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
                return;
            }
            
            const index = workShifts.findIndex(s => s.id === shiftId);
            if (index !== -1) {
                workShifts.splice(index, 1);
                
                // Lưu vào localStorage
                StorageUtil.saveJson(STORAGE_KEYS.workShifts, workShifts);
                if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                
                // Render lại bảng
                renderWorkShiftsTable();
                
                alert('✅ Đã xóa ca làm việc thành công!');
            }
        }
        
        // Render calendar ngày công cho một bác sĩ cụ thể
        function renderNgayCongCalendar(doctorKey) {
            const container = document.getElementById('ngaycongCalendarContainer');
            if (!container) return;
            
            if (!doctorKey) {
                container.innerHTML = '<p style="color: #666; padding: 20px;">Vui lòng chọn bác sĩ để xem ngày công.</p>';
                return;
            }
            
            // Lấy tên hiển thị của bác sĩ
            let doctorDisplayName = '';
            ['cot1', 'cot2', 'cot3', 'partime', 'khac', 'lanhdao'].forEach(group => {
                const doctorList = doctors[group] || [];
                const found = doctorList.find(doc => {
                    const key = normalizeKey(doc.name || doc.displayName || '');
                    return key === doctorKey;
                });
                if (found) {
                    doctorDisplayName = found.displayName || found.name || '';
                }
            });
            
            if (!doctorDisplayName) {
                container.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Không tìm thấy thông tin bác sĩ.</p>';
                return;
            }
            
            // Render calendar riêng cho ngày công cá nhân
            renderDoctorWorkDaysCalendar('ngaycongCalendarContainer', doctorKey, doctorDisplayName);
        }
        
        // Render calendar chỉ hiển thị ngày công của một bác sĩ cụ thể
        function renderDoctorWorkDaysCalendar(containerId, doctorKey, doctorDisplayName) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            
            const today = new Date();
            const numCycles = 5;
            
            // Tính toán chu kỳ đầu tiên chứa ngày hiện tại (từ ngày 25 đến ngày 24)
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderDoctorWorkDaysMonthCycle(cycleStart, cycleEnd, doctorKey, doctorDisplayName);
                container.appendChild(monthEl);
            }
        }
        
        // Render một chu kỳ tháng cho ngày công cá nhân
        function renderDoctorWorkDaysMonthCycle(cycleStart, cycleEnd, doctorKey, doctorDisplayName) {
            const month = document.createElement('div');
            month.style.flex = '0 1 100%';
            month.style.width = '100%';
            month.style.minWidth = '100%';
            month.style.maxWidth = '100%';
            month.style.background = '#fff';
            month.style.borderRadius = '10px';
            month.style.padding = '14px';
            month.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
            
            // Tính số công chuẩn và thực tế
            const standardDays = calculateStandardWorkDays(cycleStart, cycleEnd);
            const actualDays = calculateActualWorkDays(cycleStart, cycleEnd, doctorKey);
            
            // Gộp title và tổng số công thành một dòng
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            const isEnoughWorkDays = actualDays >= standardDays;
            
            const titleDiv = document.createElement('div');
            titleDiv.style.textAlign = 'center';
            titleDiv.style.fontWeight = '700';
            titleDiv.style.fontSize = '16px';
            titleDiv.style.marginBottom = '12px';
            titleDiv.style.padding = '10px';
            titleDiv.style.borderRadius = '8px';
            titleDiv.style.border = '2px solid ' + (isEnoughWorkDays ? '#27ae60' : '#f39c12');
            
            // Thiếu công: nền vàng nhạt, Đủ công: nền xanh nhạt
            if (isEnoughWorkDays) {
                titleDiv.style.background = '#e8f8f5'; // Xanh nhạt
            } else {
                titleDiv.style.background = '#fff9e6'; // Vàng nhạt
            }
            
            titleDiv.textContent = `Ngày công của ${doctorDisplayName} - Tháng ${monthNum}/${year} (tổng số công ${actualDays.toFixed(1)} / ${standardDays.toFixed(1)})`;
            month.appendChild(titleDiv);
            
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(7,1fr)';
            grid.style.gap = '8px';
            
            // weekday headers
            const weekdays = ['T2','T3','T4','T5','T6','T7','CN'];
            weekdays.forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.textAlign = 'center';
                wEl.style.fontSize = '14px';
                wEl.style.color = '#666';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            
            // Tính toán offset cho ngày đầu tiên của chu kỳ
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            
            // empty slots
            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                grid.appendChild(empty);
            }
            
            // Tạo danh sách tất cả các ngày trong chu kỳ
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            const todayForCompare = new Date();
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            // Render từng ngày
            for (const date of allDates) {
                const key = toLocalDateKey(date);
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && 
                                date.getMonth() === todayForCompare.getMonth() && 
                                date.getDate() === todayForCompare.getDate();
                
                const dayCell = document.createElement('div');
                const isHolidayWork = typeof isHolidayCell === 'function' && isHolidayCell(key);
                if (isToday) {
                    dayCell.style.border = '3px solid #3498db';
                } else {
                    dayCell.style.border = '1px solid #e6e9ef';
                }
                dayCell.style.borderRadius = '6px';
                dayCell.style.padding = '8px';
                dayCell.style.background = isHolidayWork ? '#d32f2f' : '#f8fafc';
                if (isHolidayWork) dayCell.style.color = '#fff';
                dayCell.style.minHeight = '100px';
                dayCell.style.position = 'relative';
                dayCell.style.display = 'flex';
                dayCell.style.flexDirection = 'column';
                dayCell.style.gap = '4px';
                dayCell.style.width = '100%';
                dayCell.style.minWidth = '0';
                dayCell.style.maxWidth = '100%';
                dayCell.style.overflow = 'hidden';
                dayCell.style.wordWrap = 'break-word';
                
                // Ngày
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.fontSize = '13px';
                dayLabel.style.fontWeight = '600';
                dayLabel.style.marginBottom = '4px';
                dayCell.appendChild(dayLabel);
                if (isHolidayWork) {
                    const hl = getHolidayDisplayLabel(key);
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.fontSize = '11px';
                        holidayBadge.style.marginBottom = '4px';
                        holidayBadge.style.fontWeight = '500';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                
                // Tính số công của ngày này
                const weekday = date.getDay();
                let dayWorkValue = 0;
                let leaveInfo = [];
                
                if (weekday === 0 && !isHolidayWork) {
                    // Chủ nhật: không tính công
                    dayWorkValue = 0;
                    dayCell.style.background = '#f0f0f0';
                    dayCell.style.opacity = '0.6';
                } else if (weekday === 6) {
                    // Thứ 7: tính 0.5 công
                    dayWorkValue = 0.5;
                } else {
                    // Thứ 2-6: tính 1 công
                    dayWorkValue = 1;
                }
                
                // Kiểm tra nghỉ phép
                const dayData = quanlynghiphepData[key] || {
                    ld: { doctors: [], maxCount: 0 },
                    c1: { doctors: [], maxCount: 0 },
                    c2: { doctors: [], maxCount: 0 },
                    c3: { doctors: [], maxCount: 0 }
                };
                
                // Kiểm tra trong quanlynghiphepData
                ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                    const columnData = dayData[col] || { doctors: [] };
                    const doctorsList = columnData.doctors || [];
                    const found = doctorsList.find(d => {
                        const dKey = d && typeof d === 'object' ? d.key : d;
                        return dKey === doctorKey;
                    });
                    if (found) {
                        const period = found && typeof found === 'object' ? found.period : 'full';
                        leaveInfo.push({
                            column: col === 'ld' ? 'LĐ' : (col === 'c1' ? 'C1' : (col === 'c2' ? 'C2' : 'C3')),
                            period: period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày')
                        });
                    }
                });
                
                // Kiểm tra lịch nghỉ cố định
                const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
                if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                    ['ld', 'c1', 'c2', 'c3'].forEach(col => {
                        const fixedDoctors = getFixedScheduleForWeekday(col, fixedWeekdayKey);
                        const isInFixed = fixedDoctors.some(fd => {
                            const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                            return fdKey === doctorKey;
                        });
                        
                        if (isInFixed) {
                            const foundFixed = fixedDoctors.find(fd => {
                                const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                                return fdKey === doctorKey;
                            });
                            const period = foundFixed && typeof foundFixed === 'object' ? foundFixed.period : 'full';
                            const columnName = col === 'ld' ? 'LĐ' : (col === 'c1' ? 'C1' : (col === 'c2' ? 'C2' : 'C3'));
                            
                            // Chỉ thêm nếu chưa có (ưu tiên lịch nghỉ đã chọn thủ công)
                            if (!leaveInfo.some(info => info.column === columnName)) {
                                leaveInfo.push({
                                    column: columnName,
                                    period: period === 'morning' ? 'Sáng' : (period === 'afternoon' ? 'Chiều' : 'Cả ngày'),
                                    isFixed: true
                                });
                            }
                        }
                    });
                }
                
                // Tính số công thực tế sau khi trừ nghỉ phép
                let actualDayWorkValue = dayWorkValue;
                leaveInfo.forEach(info => {
                    if (info.period === 'Cả ngày') {
                        actualDayWorkValue = 0;
                    } else if (info.period === 'Sáng' || info.period === 'Chiều') {
                        actualDayWorkValue -= 0.5;
                    }
                });
                
                // Hiển thị số công
                const workValueDiv = document.createElement('div');
                workValueDiv.style.fontSize = '14px';
                workValueDiv.style.fontWeight = '700';
                workValueDiv.style.color = actualDayWorkValue > 0 ? '#27ae60' : (actualDayWorkValue === 0 && weekday !== 0 ? '#e74c3c' : '#666');
                workValueDiv.textContent = `Công: ${actualDayWorkValue.toFixed(1)}`;
                dayCell.appendChild(workValueDiv);
                
                // Hiển thị thông tin nghỉ phép
                if (leaveInfo.length > 0) {
                    leaveInfo.forEach(info => {
                        const infoDiv = document.createElement('div');
                        infoDiv.style.fontSize = '11px';
                        infoDiv.style.padding = '3px 5px';
                        infoDiv.style.background = '#fff3cd';
                        infoDiv.style.borderRadius = '3px';
                        infoDiv.style.border = '1px solid #ffc107';
                        const fixedLabel = info.isFixed ? ' (Cố định)' : '';
                        infoDiv.textContent = `${info.column}: Nghỉ ${info.period}${fixedLabel}`;
                        dayCell.appendChild(infoDiv);
                    });
                }
                
                grid.appendChild(dayCell);
            }
            
            month.appendChild(grid);
            return month;
        }
        
        // Update data for Quản lý nghỉ phép
        function updateQuanLyNghiPhepData(dateStr, column, doctorKeys, maxCount = 0) {
            if (!quanlynghiphepData[dateStr]) {
                quanlynghiphepData[dateStr] = {};
            }
            // Chỉ ghi đè cột được lưu; các cột khác giữ nguyên để modal merge lịch cố định khi chưa lưu
            quanlynghiphepData[dateStr][column] = {
                doctors: Array.isArray(doctorKeys) ? doctorKeys : [],
                maxCount: parseInt(maxCount) || 0
            };
            saveQuanLyNghiPhepData();
            // Re-render calendar to update display
            renderAdminCalendars();
        }
        
        // Get doctor display name by key (ưu tiên displayName - tên hiển thị ngắn gọn)
        function getDoctorNameByKey(doctorKey, column) {
            const doctorList = column === 'ld' ? doctors.lanhdao : (column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3));
            const doctor = doctorList.find(doc => {
                const key = normalizeKey(doc.name || doc.displayName || '');
                return key === doctorKey;
            });
            // Ưu tiên displayName (tên hiển thị ngắn gọn), nếu không có thì dùng name
            return doctor ? (doctor.displayName || doctor.name || '') : '';
        }
        
        
        // Open modal to select doctors for a specific date and column
        function openSelectDoctorsModal(dateStr, column) {
            // Kiểm tra ngày có phải là ngày trong quá khứ không (không bao gồm ngày hiện tại)
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            // Chỉ khóa các ngày trước ngày hiện tại, không khóa ngày hiện tại
            if (dateStr < todayKey) {
                alert('❌ Không thể chọn bác sĩ nghỉ phép cho ngày trong quá khứ.');
                return;
            }
            
            // Kiểm tra quyền trước khi mở modal
            if (!hasPermissionForNghiPhepColumn(column)) {
                alert('❌ Bạn không có quyền chọn bác sĩ nghỉ phép cho ' + (column === 'ld' ? 'Lãnh đạo' : (column === 'c1' ? 'cột1' : (column === 'c2' ? 'cột2' : 'cột3'))) + '. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            const modal = document.getElementById('selectDoctorsModal');
            if (!modal) return;
            
            const columnLabel = column === 'ld' ? 'Lãnh đạo (LĐ)' : (column === 'c1' ? 'cột1' : (column === 'c2' ? 'cột2' : 'cột3'));
            document.getElementById('selectDoctorsModalTitle').textContent = `Chọn bác sĩ nghỉ phép - ${columnLabel}`;
            
            const doctorList = column === 'ld' ? doctors.lanhdao : (column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3));
            const container = document.getElementById('selectDoctorsList');
            container.innerHTML = '';
            
            // Get currently selected doctors and maxCount
            const dayData = quanlynghiphepData[dateStr] || { 
                ld: { doctors: [], maxCount: 0 }, 
                c1: { doctors: [], maxCount: 0 }, 
                c2: { doctors: [], maxCount: 0 }, 
                c3: { doctors: [], maxCount: 0 } 
            };
            
            // Lấy dữ liệu cột(format mới: object với doctors array)
            let columnData = dayData[column];
            if (!columnData || typeof columnData !== 'object' || !Array.isArray(columnData.doctors)) {
                columnData = { doctors: [], maxCount: columnData?.maxCount || 0 };
            }
            
            // Format mới: doctors là mảng các object {key, period}
            let selectedDoctors = columnData.doctors || [];
            
            // Merge với lịch nghỉ cố định CHỈ khi chưa có dữ liệu đã lưu cho ngày này
            // Nếu admin đã mở modal và bấm Lưu (kể cả khi bỏ tick bác sĩ) thì chỉ dùng danh sách đã lưu
            const hasSavedData = quanlynghiphepData[dateStr] && quanlynghiphepData[dateStr][column] && Array.isArray(quanlynghiphepData[dateStr][column].doctors);
            if (!hasSavedData) {
                try {
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    const weekday = dateObj.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
                    const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
                    if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                        const fixedDoctors = getFixedScheduleForWeekday(column, fixedWeekdayKey);
                        if (fixedDoctors && fixedDoctors.length > 0) {
                            const existingDoctorKeys = selectedDoctors
                                .filter(d => d && typeof d === 'object' && d.key)
                                .map(d => d.key);
                            fixedDoctors.forEach(fixedDoctor => {
                                const fixedKey = fixedDoctor && typeof fixedDoctor === 'object' ? fixedDoctor.key : fixedDoctor;
                                if (!existingDoctorKeys.includes(fixedKey)) {
                                    selectedDoctors.push(fixedDoctor);
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Lỗi khi merge fixedScheduleData:', e);
                }
            }
            
            const selectedDoctorsMap = {};
            selectedDoctors.forEach(item => {
                if (item && typeof item === 'object' && item.key) {
                    selectedDoctorsMap[item.key] = item;
                } else if (typeof item === 'string') {
                    // Hỗ trợ format cũ
                    selectedDoctorsMap[item] = { key: item, period: 'full' };
                }
            });
            
            // Lấy lịch nghỉ cố định để hiển thị indicator
            let fixedDoctorsForDay = [];
            try {
                const dateObj = new Date(dateStr + 'T00:00:00');
                const weekday = dateObj.getDay();
                const fixedWeekdayKey = weekday === 0 ? 7 : weekday;
                if (fixedWeekdayKey >= 1 && fixedWeekdayKey <= 6) {
                    fixedDoctorsForDay = getFixedScheduleForWeekday(column, fixedWeekdayKey);
                }
            } catch (e) {
                console.warn('Lỗi khi lấy fixedScheduleData:', e);
            }
            
            const fixedDoctorKeys = new Set();
            fixedDoctorsForDay.forEach(fd => {
                const fdKey = fd && typeof fd === 'object' ? fd.key : fd;
                if (fdKey) fixedDoctorKeys.add(fdKey);
            });
            
            doctorList.forEach(doc => {
                // Ưu tiên displayName (tên hiển thị ngắn gọn) để hiển thị
                const doctorDisplayName = doc.displayName || doc.name || '';
                // Dùng name để tạo key (vì key được tạo từ name khi lưu)
                const doctorName = doc.name || doc.displayName || '';
                const doctorKey = normalizeKey(doctorName);
                const isSelected = selectedDoctorsMap.hasOwnProperty(doctorKey);
                const selectedPeriod = isSelected ? (selectedDoctorsMap[doctorKey].period || 'full') : 'full';
                const isFromFixedSchedule = fixedDoctorKeys.has(doctorKey);
                
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.flexDirection = 'column';
                label.style.padding = '10px';
                label.style.cursor = 'pointer';
                label.style.borderBottom = '1px solid #eee';
                label.style.gap = '8px';
                
                // Dòng đầu: checkbox và tên bác sĩ
                const firstRow = document.createElement('div');
                firstRow.style.display = 'flex';
                firstRow.style.alignItems = 'center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = doctorKey;
                checkbox.checked = isSelected;
                checkbox.style.marginRight = '8px';
                checkbox.onchange = () => {
                    updateModalRowColors(column, dateStr);
                    updatePeriodVisibility(doctorKey);
                };
                
                const nameSpan = document.createElement('span');
                nameSpan.style.display = 'flex';
                nameSpan.style.alignItems = 'center';
                nameSpan.style.gap = '6px';
                nameSpan.style.flex = '1';
                
                const nameText = document.createElement('span');
                nameText.textContent = doctorDisplayName;
                nameText.style.fontWeight = '600';
                nameSpan.appendChild(nameText);
                
                // Hiển thị badge "Cố định" nếu bác sĩ có trong lịch nghỉ cố định
                if (isFromFixedSchedule) {
                    const fixedBadge = document.createElement('span');
                    fixedBadge.textContent = '(Cố định)';
                    fixedBadge.style.color = '#666';
                    fixedBadge.style.fontSize = '12px';
                    fixedBadge.style.fontWeight = 'normal';
                    fixedBadge.style.fontStyle = 'italic';
                    nameSpan.appendChild(fixedBadge);
                }
                
                firstRow.appendChild(checkbox);
                firstRow.appendChild(nameSpan);
                
                // Dòng thứ hai: radio buttons cho thời gian nghỉ (chỉ hiển thị khi checkbox được chọn)
                const secondRow = document.createElement('div');
                secondRow.style.display = isSelected ? 'flex' : 'none';
                secondRow.style.gap = '15px';
                secondRow.style.marginLeft = '24px';
                secondRow.style.fontSize = '13px';
                secondRow.id = `periodRow_${doctorKey}`;
                
                const periods = [
                    { value: 'morning', label: 'Nghỉ sáng' },
                    { value: 'afternoon', label: 'Nghỉ chiều' },
                    { value: 'full', label: 'Nghỉ cả ngày' }
                ];
                
                periods.forEach(period => {
                    const periodLabel = document.createElement('label');
                    periodLabel.style.display = 'flex';
                    periodLabel.style.alignItems = 'center';
                    periodLabel.style.cursor = 'pointer';
                    periodLabel.style.gap = '4px';
                    
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `period_${doctorKey}`;
                    radio.value = period.value;
                    radio.checked = selectedPeriod === period.value;
                    radio.disabled = !isSelected;
                    radio.onchange = () => updateModalRowColors(column, dateStr);
                    
                    periodLabel.appendChild(radio);
                    periodLabel.appendChild(document.createTextNode(period.label));
                    secondRow.appendChild(periodLabel);
                });
                
                label.appendChild(firstRow);
                label.appendChild(secondRow);
                container.appendChild(label);
            });
            
            // Hàm để cập nhật hiển thị radio buttons khi checkbox thay đổi
            window.updatePeriodVisibility = function(doctorKey) {
                const checkbox = document.querySelector(`#selectDoctorsList input[value="${doctorKey}"]`);
                const periodRow = document.getElementById(`periodRow_${doctorKey}`);
                if (checkbox && periodRow) {
                    const isChecked = checkbox.checked;
                    periodRow.style.display = isChecked ? 'flex' : 'none';
                    // Disable/enable radio buttons
                    periodRow.querySelectorAll('input[type="radio"]').forEach(radio => {
                        radio.disabled = !isChecked;
                    });
                    // Nếu checkbox bị bỏ chọn, reset về 'full'
                    if (!isChecked) {
                        const fullRadio = periodRow.querySelector('input[value="full"]');
                        if (fullRadio) fullRadio.checked = true;
                    }
                }
            };
            
            // Cập nhật màu sắc các dòng trong modal
            updateModalRowColors(column, dateStr);
            
            // Store current date and column for save function
            modal.dataset.dateStr = dateStr;
            modal.dataset.column = column;
            
            modal.classList.add('active');
        }
        
        // Close select doctors modal
        function closeSelectDoctorsModal() {
            const modal = document.getElementById('selectDoctorsModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Save selected doctors
        function saveSelectedDoctors() {
            const modal = document.getElementById('selectDoctorsModal');
            if (!modal) return;
            
            const dateStr = modal.dataset.dateStr;
            const column = modal.dataset.column;
            if (!dateStr || !column) return;
            
            // Kiểm tra quyền trước khi lưu
            if (!hasPermissionForNghiPhepColumn(column)) {
                alert('❌ Bạn không có quyền chọn bác sĩ nghỉ phép cho ' + (column === 'c1' ? 'cột1' : (column === 'c2' ? 'cột2' : 'cột3')) + '. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            const checkboxes = document.querySelectorAll('#selectDoctorsList input[type="checkbox"]:checked');
            const selectedDoctors = [];
            
            checkboxes.forEach(checkbox => {
                const doctorKey = checkbox.value;
                // Lấy period đã chọn cho bác sĩ này
                const periodRadio = document.querySelector(`input[name="period_${doctorKey}"]:checked`);
                const period = periodRadio ? periodRadio.value : 'full';
                selectedDoctors.push({ key: doctorKey, period: period });
            });
            
            // Không lưu maxCount nữa, sẽ lấy từ cài đặt theo ngày trong tuần
            updateQuanLyNghiPhepData(dateStr, column, selectedDoctors, 0);
            closeSelectDoctorsModal();
        }
        
        // Cập nhật màu sắc các dòng trong modal dựa trên số lượng cho phép theo ngày trong tuần
        function updateModalRowColors(column, dateStr) {
            if (!dateStr) return;
            
            // Lấy ngày trong tuần từ dateStr
            const date = new Date(dateStr + 'T00:00:00');
            const weekday = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
            // Chuyển đổi: 0 (CN) -> 7, 1 (T2) -> 1, ..., 6 (T7) -> 6
            const weekdayKey = weekday === 0 ? 7 : weekday;
            
            // Lấy maxCount từ cài đặt theo ngày trong tuần
            const maxCount = weekdayKey >= 1 && weekdayKey <= 6 ? getMaxCountForWeekday(column, weekdayKey) : 0;
            
            if (maxCount <= 0) {
                // Nếu không có số lượng cho phép, xóa màu vàng rơm
                document.querySelectorAll('#selectDoctorsList label').forEach(label => {
                    label.style.background = '';
                    label.style.borderLeft = '';
                    label.style.paddingLeft = '';
                });
                return;
            }
            
            // Tính tổng số lượng đăng ký nghỉ phép (đã duyệt + đang chờ duyệt) cho cộtnày
            const approvedSubs = submissions.filter(s => s.date === dateStr && s.status === 'approved');
            const pendingSubs = submissions.filter(s => s.date === dateStr && s.status === 'pending');
            
            // Lấy danh sách bác sĩ của cộtđể kiểm tra
            const columnDoctors = column === 'c1' ? doctors.cot1 : (column === 'c2' ? doctors.cot2 : doctors.cot3);
            const columnDoctorKeys = columnDoctors.map(doc => normalizeKey(doc.name || doc.displayName || ''));
            
            // Lấy danh sách các bác sĩ đã đăng ký nghỉ phép (đã duyệt + đang chờ) trong cộtnày
            const requestDoctorKeys = new Set();
            approvedSubs.forEach(s => {
                const docKey = normalizeKey(s.doctorName || '');
                if (columnDoctorKeys.includes(docKey)) {
                    requestDoctorKeys.add(docKey);
                }
            });
            pendingSubs.forEach(s => {
                const docKey = normalizeKey(s.doctorName || '');
                if (columnDoctorKeys.includes(docKey)) {
                    requestDoctorKeys.add(docKey);
                }
            });
            
            // Đếm số lượng checkbox đã checked trong modal
            const checkedBoxes = document.querySelectorAll('#selectDoctorsList input[type="checkbox"]:checked');
            checkedBoxes.forEach(checkbox => {
                const doctorKey = checkbox.value;
                // Thêm vào set để tránh đếm trùng
                requestDoctorKeys.add(doctorKey);
            });
            
            // Tổng số lượng = số lượng bác sĩ duy nhất (từ đăng ký nghỉ phép + từ checkbox checked)
            const totalCount = requestDoctorKeys.size;
            
            // Nếu tổng số lượng >= maxCount, tô màu vàng rơm cho toàn bộ dòng
            if (totalCount >= maxCount) {
                document.querySelectorAll('#selectDoctorsList label').forEach(label => {
                    label.style.background = '#f4d03f'; // Màu vàng rơm
                    label.style.borderLeft = '3px solid #f39c12';
                    label.style.paddingLeft = '8px';
                });
            } else {
                // Nếu chưa đạt, xóa màu vàng rơm
                document.querySelectorAll('#selectDoctorsList label').forEach(label => {
                    label.style.background = '';
                    label.style.borderLeft = '';
                    label.style.paddingLeft = '';
                });
            }
        }
        
        // Mở modal thiết lập số lượng nghỉ phép theo ngày trong tuần
        function openMaxCountModal() {
            const modal = document.getElementById('maxCountModal');
            if (!modal) return;
            
            const container = document.getElementById('maxCountTable');
            if (!container) return;
            
            container.innerHTML = '';
            
            const weekdays = [
                { key: 1, name: 'Thứ 2' },
                { key: 2, name: 'Thứ 3' },
                { key: 3, name: 'Thứ 4' },
                { key: 4, name: 'Thứ 5' },
                { key: 5, name: 'Thứ 6' },
                { key: 6, name: 'Thứ 7' }
            ];
            
            const columns = [
                { key: 'ld', name: 'Lãnh đạo (LĐ)' },
                { key: 'c1', name: 'cột1' },
                { key: 'c2', name: 'cột2' },
                { key: 'c3', name: 'cột3' }
            ];
            
            // Tạo bảng với các thứ là cột, các cộtbác sĩ là hàng
            let html = '<div style="overflow-x: auto; width: 100%;"><table style="width: 100%; border-collapse: collapse; min-width: 800px;">';
            html += '<thead><tr><th style="padding: 12px; border: 1px solid #ddd; background: #f8f9fa; text-align: left; min-width: 150px; width: 150px;">Cột</th>';
            weekdays.forEach(day => {
                html += `<th style="padding: 12px; border: 1px solid #ddd; background: #f8f9fa; text-align: center; min-width: 130px; width: 130px;">${day.name}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Thêm các hàng cho từng cộtbác sĩ (cột1, cột2, cột3)
            columns.forEach(col => {
                html += `<tr><td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; background: #e8f4f8; color: #667eea; min-width: 150px; width: 150px;">${col.name}</td>`;
                weekdays.forEach(day => {
                    const value = maxCountByWeekday[col.key] && maxCountByWeekday[col.key][day.key] !== undefined 
                        ? maxCountByWeekday[col.key][day.key] : 0;
                    html += `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; min-width: 130px; width: 130px;">
                        <input type="number" 
                               id="maxCount-${col.key}-${day.key}" 
                               min="0" 
                               value="${value}" 
                               style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-size: 14px;">
                    </td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
            
            modal.classList.add('active');
        }
        
        // Đóng modal maxCount
        function closeMaxCountModal() {
            const modal = document.getElementById('maxCountModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Lưu cài đặt số lượng nghỉ phép theo ngày trong tuần
        function saveMaxCountSettings() {
            const weekdays = [1, 2, 3, 4, 5, 6]; // Thứ 2 - Thứ 7
            const columns = ['ld', 'c1', 'c2', 'c3'];
            
            columns.forEach(col => {
                if (!maxCountByWeekday[col]) {
                    maxCountByWeekday[col] = {};
                }
                weekdays.forEach(day => {
                    const input = document.getElementById(`maxCount-${col}-${day}`);
                    if (input) {
                        maxCountByWeekday[col][day] = parseInt(input.value) || 0;
                    }
                });
            });
            
            saveMaxCountByWeekday();
            closeMaxCountModal();
            // Render lại calendar để cập nhật màu sắc
            if (typeof renderAdminCalendars === 'function') {
                renderAdminCalendars();
            }
            alert('✅ Đã lưu cài đặt số lượng bác sĩ được nghỉ phép theo ngày trong tuần.');
        }
        
        // Mở modal lịch nghỉ cố định
        function openFixedScheduleModal() {
            const modal = document.getElementById('fixedScheduleModal');
            if (!modal) return;
            
            const container = document.getElementById('fixedScheduleTable');
            if (!container) return;
            
            container.innerHTML = '';
            
            const weekdays = [
                { key: 1, name: 'Thứ 2' },
                { key: 2, name: 'Thứ 3' },
                { key: 3, name: 'Thứ 4' },
                { key: 4, name: 'Thứ 5' },
                { key: 5, name: 'Thứ 6' },
                { key: 6, name: 'Thứ 7' }
            ];
            
            const columns = [
                { key: 'ld', name: 'Lãnh đạo (LĐ)' },
                { key: 'c1', name: 'cột1' },
                { key: 'c2', name: 'cột2' },
                { key: 'c3', name: 'cột3' }
            ];
            
            // Tạo một bảng cho mỗi ngày trong tuần
            weekdays.forEach(day => {
                const dayTable = document.createElement('div');
                dayTable.style.flex = '0 0 auto';
                dayTable.style.width = 'auto';
                dayTable.style.minWidth = '200px';
                dayTable.style.maxWidth = '280px';
                dayTable.style.background = '#fff';
                dayTable.style.border = '1px solid #ddd';
                dayTable.style.borderRadius = '8px';
                dayTable.style.padding = '15px';
                dayTable.style.overflowY = 'auto';
                dayTable.style.maxHeight = 'calc(90vh - 200px)';
                
                const title = document.createElement('h3');
                title.textContent = day.name;
                title.style.marginTop = '0';
                title.style.marginBottom = '10px';
                title.style.color = '#333';
                title.style.fontSize = '14px';
                dayTable.appendChild(title);
                
                columns.forEach(col => {
                    const colSection = document.createElement('div');
                    colSection.style.marginBottom = '15px';
                    
                    const colTitle = document.createElement('div');
                    colTitle.textContent = col.name;
                    colTitle.style.fontWeight = '600';
                    colTitle.style.marginBottom = '6px';
                    colTitle.style.color = '#667eea';
                    colTitle.style.fontSize = '13px';
                    colSection.appendChild(colTitle);
                    
                    const doctorList = col.key === 'ld' ? doctors.lanhdao : (col.key === 'c1' ? doctors.cot1 : (col.key === 'c2' ? doctors.cot2 : doctors.cot3));
                    const fixedDoctors = getFixedScheduleForWeekday(col.key, day.key);
                    const fixedDoctorKeys = fixedDoctors.map(d => d.key || d);
                    
                    doctorList.forEach(doc => {
                        const doctorDisplayName = doc.displayName || doc.name || '';
                        const doctorName = doc.name || doc.displayName || '';
                        const doctorKey = normalizeKey(doctorName);
                        const isSelected = fixedDoctorKeys.includes(doctorKey);
                        const selectedDoctor = fixedDoctors.find(d => (d.key || d) === doctorKey);
                        const selectedPeriod = selectedDoctor && selectedDoctor.period ? selectedDoctor.period : 'full';
                        
                        const label = document.createElement('label');
                        label.style.display = 'flex';
                        label.style.flexDirection = 'column';
                        label.style.padding = '6px 8px';
                        label.style.cursor = 'pointer';
                        label.style.borderBottom = '1px solid #eee';
                        label.style.gap = '4px';
                        
                        const firstRow = document.createElement('div');
                        firstRow.style.display = 'flex';
                        firstRow.style.alignItems = 'center';
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = doctorKey;
                        checkbox.checked = isSelected;
                        checkbox.setAttribute('data-column', col.key);
                        checkbox.setAttribute('data-weekday', day.key);
                        checkbox.style.marginRight = '6px';
                        checkbox.onchange = () => updateFixedPeriodVisibility(doctorKey, col.key, day.key);
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.textContent = doctorDisplayName;
                        nameSpan.style.fontSize = '14px';
                        nameSpan.style.whiteSpace = 'nowrap';
                        nameSpan.style.overflow = 'hidden';
                        nameSpan.style.textOverflow = 'ellipsis';
                        
                        firstRow.appendChild(checkbox);
                        firstRow.appendChild(nameSpan);
                        
                        const secondRow = document.createElement('div');
                        secondRow.style.display = isSelected ? 'flex' : 'none';
                        secondRow.style.gap = '8px';
                        secondRow.style.marginLeft = '0';
                        secondRow.style.fontSize = '13px';
                        secondRow.style.flexWrap = 'wrap';
                        secondRow.id = `fixedPeriodRow_${col.key}_${day.key}_${doctorKey}`;
                        
                        const periods = [
                            { value: 'morning', label: 'Sáng' },
                            { value: 'afternoon', label: 'Chiều' },
                            { value: 'full', label: 'Cả ngày' }
                        ];
                        
                        periods.forEach(period => {
                            const periodLabel = document.createElement('label');
                            periodLabel.style.display = 'flex';
                            periodLabel.style.alignItems = 'center';
                            periodLabel.style.cursor = 'pointer';
                            periodLabel.style.gap = '4px';
                            
                            const radio = document.createElement('input');
                            radio.type = 'radio';
                            radio.name = `fixedPeriod_${col.key}_${day.key}_${doctorKey}`;
                            radio.value = period.value;
                            radio.checked = selectedPeriod === period.value;
                            radio.disabled = !isSelected;
                            
                            periodLabel.appendChild(radio);
                            periodLabel.appendChild(document.createTextNode(period.label));
                            secondRow.appendChild(periodLabel);
                        });
                        
                        label.appendChild(firstRow);
                        label.appendChild(secondRow);
                        colSection.appendChild(label);
                    });
                    
                    dayTable.appendChild(colSection);
                });
                
                container.appendChild(dayTable);
            });
            
            modal.classList.add('active');
        }
        
        // Cập nhật hiển thị radio buttons khi checkbox thay đổi
        function updateFixedPeriodVisibility(doctorKey, column, weekday) {
            const checkbox = document.querySelector(`input[value="${doctorKey}"][data-column="${column}"][data-weekday="${weekday}"]`);
            const periodRow = document.getElementById(`fixedPeriodRow_${column}_${weekday}_${doctorKey}`);
            if (checkbox && periodRow) {
                const isChecked = checkbox.checked;
                periodRow.style.display = isChecked ? 'flex' : 'none';
                periodRow.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.disabled = !isChecked;
                });
                if (!isChecked) {
                    const fullRadio = periodRow.querySelector('input[value="full"]');
                    if (fullRadio) fullRadio.checked = true;
                }
            }
        }
        
        // Đóng modal lịch nghỉ cố định
        function closeFixedScheduleModal() {
            const modal = document.getElementById('fixedScheduleModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Ngày nghỉ lễ theo quy định nhà nước Việt Nam (Điều 112 Bộ luật Lao động 2019)
        // Trả về { dateStr: { label, lunar } } - label mặc định, lunar = ngày âm lịch (dd/mm)
        function getVietnameseHolidayInfo() {
            const info = {};
            const add = (dateStr, label, lunar) => { info[dateStr] = { label, lunar: lunar || '' }; };
            // Fixed: 1/1, 30/4, 1/5, 2/9, 3/9
            const fixedMap = {
                '01-01': ['Tết Dương lịch', ''],
                '04-30': ['Giải phóng miền Nam', ''],
                '05-01': ['Quốc tế lao động', ''],
                '09-02': ['Quốc khánh', ''],
                '09-03': ['Quốc khánh', '']
            };
            for (let y = 2024; y <= 2029; y++) {
                Object.keys(fixedMap).forEach(md => {
                    const [label, lunar] = fixedMap[md];
                    add(y + '-' + md, label, lunar);
                });
            }
            // Tết Âm lịch (5 ngày) - kèm ngày âm lịch
            const tetData = [
                { d: '2024-02-08', l: 'Tết Nguyên đán', al: '29/12' }, { d: '2024-02-09', l: 'Tết Nguyên đán', al: '30/12' },
                { d: '2024-02-10', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2024-02-11', l: 'Tết Nguyên đán', al: '02/01' }, { d: '2024-02-12', l: 'Tết Nguyên đán', al: '03/01' },
                { d: '2025-01-28', l: 'Tết Nguyên đán', al: '28/12' }, { d: '2025-01-29', l: 'Tết Nguyên đán', al: '29/12' },
                { d: '2025-01-30', l: 'Tết Nguyên đán', al: '30/12' }, { d: '2025-01-31', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2025-02-01', l: 'Tết Nguyên đán', al: '02/01' },
                { d: '2026-02-16', l: 'Tết Nguyên đán', al: '28/12' }, { d: '2026-02-17', l: 'Tết Nguyên đán', al: '29/12' },
                { d: '2026-02-18', l: 'Tết Nguyên đán', al: '30/12' }, { d: '2026-02-19', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2026-02-20', l: 'Tết Nguyên đán', al: '02/01' },
                { d: '2027-02-05', l: 'Tết Nguyên đán', al: '29/12' }, { d: '2027-02-06', l: 'Tết Nguyên đán', al: '30/12' },
                { d: '2027-02-07', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2027-02-08', l: 'Tết Nguyên đán', al: '02/01' }, { d: '2027-02-09', l: 'Tết Nguyên đán', al: '03/01' },
                { d: '2028-01-25', l: 'Tết Nguyên đán', al: '28/12' }, { d: '2028-01-26', l: 'Tết Nguyên đán', al: '29/12' },
                { d: '2028-01-27', l: 'Tết Nguyên đán', al: '30/12' }, { d: '2028-01-28', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2028-01-29', l: 'Tết Nguyên đán', al: '02/01' },
                { d: '2029-02-12', l: 'Tết Nguyên đán', al: '29/12' }, { d: '2029-02-13', l: 'Tết Nguyên đán', al: '30/12' },
                { d: '2029-02-14', l: 'Tết Nguyên đán', al: '01/01' }, { d: '2029-02-15', l: 'Tết Nguyên đán', al: '02/01' }, { d: '2029-02-16', l: 'Tết Nguyên đán', al: '03/01' }
            ];
            tetData.forEach(x => add(x.d, x.l, x.al));
            // Giỗ Tổ Hùng Vương 10/3 âm lịch
            const gioToData = [
                { d: '2024-04-18', l: 'Giỗ Tổ Hùng Vương', al: '10/03' },
                { d: '2025-04-07', l: 'Giỗ Tổ Hùng Vương', al: '10/03' },
                { d: '2026-04-27', l: 'Giỗ Tổ Hùng Vương', al: '10/03' },
                { d: '2027-04-16', l: 'Giỗ Tổ Hùng Vương', al: '10/03' },
                { d: '2028-04-04', l: 'Giỗ Tổ Hùng Vương', al: '10/03' },
                { d: '2029-04-23', l: 'Giỗ Tổ Hùng Vương', al: '10/03' }
            ];
            gioToData.forEach(x => add(x.d, x.l, x.al));
            return info;
        }
        function getVietnameseHolidaysSet() {
            return new Set(Object.keys(getVietnameseHolidayInfo()));
        }
        
        // Mở modal lịch nghỉ lễ
        function openHolidayCalendarModal() {
            const modal = document.getElementById('holidayCalendarModal');
            const container = document.getElementById('holidayCalendarContainer');
            if (!modal || !container) return;
            renderHolidayCalendar(container);
            modal.classList.add('active');
        }
        
        function closeHolidayCalendarModal() {
            const modal = document.getElementById('holidayCalendarModal');
            if (modal) modal.classList.remove('active');
        }
        
        function renderHolidayCalendar(container) {
            container.innerHTML = '';
            const today = new Date();
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const holidayInfo = getVietnameseHolidayInfo();
            const markedSet = new Set(holidayMarkedDates);
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.style.flex = '0 1 100%';
                monthEl.style.width = '100%';
                monthEl.style.background = '#fff';
                monthEl.style.borderRadius = '10px';
                monthEl.style.padding = '14px';
                monthEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                const title = document.createElement('div');
                title.style.textAlign = 'center';
                title.style.fontWeight = '700';
                title.style.marginBottom = '8px';
                title.textContent = `Tháng ${cycleEnd.getMonth() + 1}/${cycleEnd.getFullYear()} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
                monthEl.appendChild(title);
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(7,1fr)';
                grid.style.gap = '8px';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.textAlign = 'center';
                    wEl.style.fontSize = '14px';
                    wEl.style.color = '#666';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });
                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) {
                    grid.appendChild(document.createElement('div'));
                }
                const allDates = [];
                let cur = new Date(cycleStart);
                while (cur <= cycleEnd) {
                    allDates.push(new Date(cur));
                    cur.setDate(cur.getDate() + 1);
                }
                allDates.forEach(date => {
                    const dateStr = toLocalDateKey(date);
                    const defaultInfo = holidayInfo[dateStr] || {};
                    const isHoliday = !!defaultInfo.label;
                    const isMarked = markedSet.has(dateStr);
                    const isHolidayOrMarked = isHoliday || isMarked;
                    const customLabel = holidayLabels[dateStr];
                    const displayLabel = customLabel !== undefined && customLabel !== '' ? customLabel : (defaultInfo.label || '');
                    const lunarStr = defaultInfo.lunar ? ' (AL: ' + defaultInfo.lunar + ')' : '';
                    const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
                    const cell = document.createElement('div');
                    cell.style.border = isToday ? '3px solid #3498db' : '1px solid #e6e9ef';
                    cell.style.borderRadius = '6px';
                    cell.style.padding = '6px';
                    cell.style.cursor = 'pointer';
                    cell.style.minHeight = '70px';
                    cell.style.display = 'flex';
                    cell.style.flexDirection = 'column';
                    cell.style.justifyContent = 'flex-start';
                    cell.style.alignItems = 'stretch';
                    cell.style.gap = '4px';
                    cell.style.background = isHolidayOrMarked ? '#d32f2f' : '#f8fafc';
                    cell.style.color = isHolidayOrMarked ? '#fff' : '#333';
                    cell.style.fontSize = '11px';
                    cell.setAttribute('data-date', dateStr);
                    cell.title = isHolidayOrMarked ? 'Click để bỏ chọn. Click ô nhập để sửa nội dung.' : 'Click để đánh dấu nghỉ lễ';
                    const dayLabel = document.createElement('div');
                    dayLabel.textContent = formatDateWithWeekday ? formatDateWithWeekday(date) : (date.getDate() + '/' + (date.getMonth() + 1));
                    dayLabel.style.fontWeight = '600';
                    dayLabel.style.fontSize = '12px';
                    cell.appendChild(dayLabel);
                    if (isHolidayOrMarked) {
                        const labelInput = document.createElement('input');
                        labelInput.type = 'text';
                        labelInput.value = displayLabel;
                        labelInput.placeholder = 'Nhập tên lễ...';
                        labelInput.style.cssText = 'width:100%;padding:4px;font-size:10px;border:1px solid rgba(255,255,255,0.6);border-radius:4px;background:rgba(0,0,0,0.15);color:#fff;box-sizing:border-box;';
                        labelInput.setAttribute('data-date', dateStr);
                        labelInput.onclick = (e) => e.stopPropagation();
                        labelInput.onchange = () => updateHolidayLabel(dateStr, labelInput.value);
                        cell.appendChild(labelInput);
                        if (defaultInfo.lunar) {
                            const lunarSpan = document.createElement('div');
                            lunarSpan.textContent = 'Âm lịch: ' + defaultInfo.lunar;
                            lunarSpan.style.fontSize = '10px';
                            lunarSpan.style.opacity = '0.95';
                            cell.appendChild(lunarSpan);
                        }
                    }
                    cell.onclick = (e) => { if (!e.target.closest('input')) toggleHolidayMark(dateStr); };
                    grid.appendChild(cell);
                });
                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        
        function updateHolidayLabel(dateStr, value) {
            const v = (value || '').trim();
            if (v) {
                holidayLabels[dateStr] = v;
            } else {
                delete holidayLabels[dateStr];
            }
            saveHolidayLabels();
            const container = document.getElementById('holidayCalendarContainer');
            if (container) renderHolidayCalendar(container);
        }
        
        function toggleHolidayMark(dateStr) {
            const idx = holidayMarkedDates.indexOf(dateStr);
            if (idx >= 0) {
                holidayMarkedDates.splice(idx, 1);
            } else {
                holidayMarkedDates.push(dateStr);
                holidayMarkedDates.sort();
            }
            saveHolidayMarkedDates();
            const container = document.getElementById('holidayCalendarContainer');
            if (container) renderHolidayCalendar(container);
        }
        
        // Kiểm tra ngày có được đánh dấu nghỉ lễ không (để dùng ở nơi khác nếu cần)
        function isHolidayMarked(dateStr) {
            return holidayMarkedDates.indexOf(dateStr) >= 0;
        }
        
        // Kiểm tra ngày có phải ngày nghỉ lễ (mặc định hoặc được chọn) - dùng để tô màu ô trong các lịch
        function isHolidayCell(dateStr) {
            const holidayInfo = getVietnameseHolidayInfo();
            const isDefault = !!holidayInfo[dateStr];
            const isMarked = holidayMarkedDates.indexOf(dateStr) >= 0;
            return isDefault || isMarked;
        }
        
        // Lấy nhãn và ngày âm lịch để hiển thị trong ô ngày lễ (giống modal Lịch nghỉ lễ)
        function getHolidayDisplayLabel(dateStr) {
            const defaultInfo = getVietnameseHolidayInfo()[dateStr] || {};
            const customLabel = holidayLabels[dateStr];
            const label = (customLabel !== undefined && customLabel !== '') ? customLabel : (defaultInfo.label || '');
            return { label, lunar: defaultInfo.lunar || '' };
        }
        
        // Tính toán khoảng ngày hiển thị trong lịch nghỉ phép (3 chu kỳ từ ngày 25 đến ngày 24)
        function getCalendarDateRange() {
            const today = new Date();
            // Tính toán chu kỳ đầu tiên chứa ngày hiện tại (từ ngày 25 đến ngày 24)
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            // Nếu ngày hiện tại < 25, thì chu kỳ bắt đầu từ ngày 25 của tháng trước
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            
            // Ngày đầu tiên: ngày 25 của chu kỳ đầu tiên
            const startDate = new Date(cycleStartDate);
            startDate.setDate(25);
            
            // Ngày cuối cùng: ngày 24 của tháng thứ 3 (sau 2 tháng từ cycleStartDate)
            const endDate = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + 2, 24);
            
            return {
                start: startDate,
                end: endDate,
                startKey: startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0'),
                endKey: endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0')
            };
        }
        
        // Mở modal danh sách duyệt nghỉ phép
        function openLeaveRequestListModal() {
            const modal = document.getElementById('leaveRequestListModal');
            if (!modal) return;
            
            const content = document.getElementById('leaveRequestListContent');
            if (!content) return;
            
            // Lấy khoảng ngày từ lịch
            const dateRange = getCalendarDateRange();
            
            // Lọc submissions theo khoảng ngày
            const filteredSubmissions = submissions.filter(s => {
                if (!s.date) return false;
                return s.date >= dateRange.startKey && s.date <= dateRange.endKey;
            });
            
            // Sắp xếp theo ngày (mới nhất trước)
            filteredSubmissions.sort((a, b) => {
                if (a.date !== b.date) {
                    return b.date.localeCompare(a.date);
                }
                // Nếu cùng ngày, ưu tiên pending trước
                const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
                return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
            });
            
            // Nhóm theo ngày
            const groupedByDate = {};
            filteredSubmissions.forEach(sub => {
                if (!groupedByDate[sub.date]) {
                    groupedByDate[sub.date] = {
                        pending: [],
                        approved: [],
                        rejected: []
                    };
                }
                if (sub.status === 'pending') {
                    groupedByDate[sub.date].pending.push(sub);
                } else if (sub.status === 'approved') {
                    groupedByDate[sub.date].approved.push(sub);
                } else if (sub.status === 'rejected') {
                    groupedByDate[sub.date].rejected.push(sub);
                }
            });
            
            // Hiển thị danh sách
            content.innerHTML = '';
            
            if (filteredSubmissions.length === 0) {
                content.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: #999;">Không có yêu cầu nghỉ phép nào trong khoảng thời gian này.</div>';
                modal.classList.add('active');
                return;
            }
            
            // Hiển thị thông tin khoảng ngày
            const infoDiv = document.createElement('div');
            infoDiv.style.marginBottom = '20px';
            infoDiv.style.padding = '10px';
            infoDiv.style.background = '#e8f4f8';
            infoDiv.style.borderRadius = '4px';
            infoDiv.style.fontSize = '14px';
            infoDiv.innerHTML = `<strong>Khoảng thời gian:</strong> ${formatDate(dateRange.startKey)} đến ${formatDate(dateRange.endKey)} | <strong>Tổng số yêu cầu:</strong> ${filteredSubmissions.length}`;
            content.appendChild(infoDiv);
            
            // Hiển thị theo từng ngày
            const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
            
            sortedDates.forEach(dateKey => {
                const dayData = groupedByDate[dateKey];
                const totalForDay = dayData.pending.length + dayData.approved.length + dayData.rejected.length;
                
                // Container cho ngày
                const dayContainer = document.createElement('div');
                dayContainer.style.marginBottom = '25px';
                dayContainer.style.border = '1px solid #ddd';
                dayContainer.style.borderRadius = '8px';
                dayContainer.style.overflow = 'hidden';
                
                // Header ngày
                const dayHeader = document.createElement('div');
                dayHeader.style.padding = '12px 15px';
                dayHeader.style.background = '#f8f9fa';
                dayHeader.style.borderBottom = '1px solid #ddd';
                dayHeader.style.fontWeight = 'bold';
                dayHeader.style.fontSize = '16px';
                dayHeader.innerHTML = `📅 ${formatDate(dateKey)} <span style="font-size: 14px; font-weight: normal; color: #666;">(${totalForDay} yêu cầu)</span>`;
                dayContainer.appendChild(dayHeader);
                
                // Nội dung ngày
                const dayContent = document.createElement('div');
                dayContent.style.padding = '15px';
                
                // Hiển thị theo trạng thái
                const statuses = [
                    { key: 'pending', label: '⏳ Đang chờ duyệt', color: '#f39c12', bg: '#fff8e6', data: dayData.pending },
                    { key: 'approved', label: '✅ Đã duyệt', color: '#27ae60', bg: '#e9f9ee', data: dayData.approved },
                    { key: 'rejected', label: '❌ Từ chối', color: '#e74c3c', bg: '#fff0f0', data: dayData.rejected }
                ];
                
                statuses.forEach(status => {
                    if (status.data.length === 0) return;
                    
                    const statusDiv = document.createElement('div');
                    statusDiv.style.marginBottom = '15px';
                    
                    const statusHeader = document.createElement('div');
                    statusHeader.style.padding = '8px 12px';
                    statusHeader.style.background = status.bg;
                    statusHeader.style.borderLeft = `4px solid ${status.color}`;
                    statusHeader.style.borderRadius = '4px';
                    statusHeader.style.marginBottom = '10px';
                    statusHeader.style.fontWeight = 'bold';
                    statusHeader.style.color = status.color;
                    statusHeader.innerHTML = `${status.label} (${status.data.length})`;
                    statusDiv.appendChild(statusHeader);
                    
                    status.data.forEach(sub => {
                        const subDiv = document.createElement('div');
                        subDiv.style.padding = '10px';
                        subDiv.style.marginBottom = '8px';
                        subDiv.style.background = '#fff';
                        subDiv.style.border = '1px solid #eee';
                        subDiv.style.borderRadius = '4px';
                        
                        const doctorKey = sub.doctorKey || normalizeKey(sub.doctorName || '');
                        const doctorColumn = getDoctorColumn(doctorKey);
                        const columnInfo = doctorColumn ? ` <span style="color: #666; font-size: 12px;">(${doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3')})</span>` : '';
                        
                        const periodText = sub.period === 'morning' ? 'Sáng' : (sub.period === 'afternoon' ? 'Chiều' : 'Cả ngày');
                        
                        let subHtml = `<div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <strong>${sub.doctorName}</strong>${columnInfo}
                                <div style="font-size: 13px; color: #666; margin-top: 4px;">
                                    Ca: ${periodText}
                                    ${sub.notes ? ` | Ghi chú: ${sub.notes}` : ''}
                                </div>
                                ${sub.submitDate ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">Gửi lúc: ${formatDateTime(sub.submitDate)}</div>` : ''}
                                ${sub.decisionDate ? `<div style="font-size: 12px; color: #999; margin-top: 2px;">Quyết định lúc: ${formatDateTime(sub.decisionDate)}${sub.decisionBy ? ` bởi ${sub.decisionBy}` : ''}</div>` : ''}
                            </div>`;
                        
                        // Nếu là pending và user có quyền duyệt, thêm nút duyệt
                        if (sub.status === 'pending' && doctorColumn) {
                            const hasPermission = hasPermissionForDuyetNghiPhepColumn(doctorColumn) || (currentUser && currentUser.role === 'admin');
                            if (hasPermission) {
                                subHtml += `<div style="display: flex; gap: 8px;">
                                    <button class="submit-btn" onclick="adminDecideFromList(${sub.id}, 'approved')" style="font-size: 12px; padding: 6px 12px;">✅ Duyệt</button>
                                    <button class="delete-btn" onclick="adminDecideFromList(${sub.id}, 'rejected')" style="font-size: 12px; padding: 6px 12px;">❌ Từ chối</button>
                                </div>`;
                            }
                        }
                        
                        subHtml += `</div>`;
                        subDiv.innerHTML = subHtml;
                        statusDiv.appendChild(subDiv);
                    });
                    
                    dayContent.appendChild(statusDiv);
                });
                
                dayContainer.appendChild(dayContent);
                content.appendChild(dayContainer);
            });
            
            modal.classList.add('active');
        }
        
        // Đóng modal danh sách duyệt nghỉ phép
        function closeLeaveRequestListModal() {
            const modal = document.getElementById('leaveRequestListModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Duyệt/từ chối từ danh sách (duyệt trực tiếp trong modal, không đóng modal)
        function adminDecideFromList(id, decision) {
            // Tìm submission
            const idx = submissions.findIndex(s => s.id === id);
            if (idx === -1) {
                alert('❌ Không tìm thấy yêu cầu nghỉ phép.');
                return;
            }
            
            const submission = submissions[idx];
            
            // Tìm doctorKey và doctorColumn
            let doctorKey = submission.doctorKey;
            let doctorColumn = null;
            
            if (doctorKey) {
                doctorColumn = getDoctorColumn(doctorKey);
            }
            
            if (!doctorColumn && submission.doctorName) {
                const submissionNameKey = normalizeKey(submission.doctorName || '');
                for (const col of ['ld', 'c1', 'c2', 'c3']) {
                    const doctorList = col === 'ld' ? doctors.lanhdao : (col === 'c1' ? doctors.cot1 : (col === 'c2' ? doctors.cot2 : doctors.cot3));
                    const found = doctorList.find(doc => {
                        const nameKey = normalizeKey(doc.name || '');
                        const displayNameKey = normalizeKey(doc.displayName || '');
                        return nameKey === submissionNameKey || displayNameKey === submissionNameKey;
                    });
                    if (found) {
                        doctorKey = normalizeKey(found.name || found.displayName || '');
                        doctorColumn = col;
                        submission.doctorKey = doctorKey;
                        StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                        break;
                    }
                }
            }
            
            // Kiểm tra quyền duyệt
            if (doctorColumn && !hasPermissionForDuyetNghiPhepColumn(doctorColumn)) {
                alert('❌ Bạn không có quyền duyệt nghỉ phép cho ' + (doctorColumn === 'ld' ? 'Lãnh đạo' : (doctorColumn === 'c1' ? 'cột1' : (doctorColumn === 'c2' ? 'cột2' : 'cột3'))) + '. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            // Cập nhật trạng thái
            submissions[idx].status = decision === 'approved' ? 'approved' : 'rejected';
            submissions[idx].decisionDate = new Date().toISOString();
            submissions[idx].decisionBy = currentUser.username || currentUser.name;
            StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
            
            // Nếu duyệt chấp nhận, tự động thêm vào lịch nghỉ phép
            if (decision === 'approved' && doctorColumn) {
                const dateStr = submission.date;
                const period = submission.period || 'full';
                
                const normalizeDateStr = (dateStr) => {
                    if (!dateStr) return '';
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        return dateStr;
                    }
                    try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            return d.toISOString().split('T')[0];
                        }
                    } catch (e) {}
                    return dateStr;
                };
                
                const normalizedDateStr = normalizeDateStr(dateStr);
                const dayData = quanlynghiphepData[normalizedDateStr] || { 
                    c1: { doctors: [], maxCount: 0 }, 
                    c2: { doctors: [], maxCount: 0 }, 
                    c3: { doctors: [], maxCount: 0 } 
                };
                
                let columnData = dayData[doctorColumn];
                if (!columnData || typeof columnData !== 'object' || !Array.isArray(columnData.doctors)) {
                    columnData = { doctors: [], maxCount: columnData?.maxCount || 0 };
                }
                
                const existingDoctorKeys = columnData.doctors
                    .filter(d => d && typeof d === 'object' && d.key)
                    .map(d => d.key);
                
                if (!existingDoctorKeys.includes(doctorKey)) {
                    columnData.doctors.push({ key: doctorKey, period: period });
                    dayData[doctorColumn] = columnData;
                    quanlynghiphepData[normalizedDateStr] = dayData;
                    saveQuanLyNghiPhepData();
                } else {
                    const existingIndex = columnData.doctors.findIndex(d => 
                        d && typeof d === 'object' && d.key === doctorKey
                    );
                    if (existingIndex !== -1) {
                        columnData.doctors[existingIndex].period = period;
                        dayData[doctorColumn] = columnData;
                        quanlynghiphepData[normalizedDateStr] = dayData;
                        saveQuanLyNghiPhepData();
                    }
                }
            }
            
            // Thông báo cho người dùng
            const userKey = submission.doctorKey;
            if (accounts[userKey]) {
                accounts[userKey].notifications = accounts[userKey].notifications || [];
                accounts[userKey].notifications.push({
                    id: Date.now(),
                    date: submission.date,
                    period: submission.period,
                    status: submission.status,
                    message: submission.status === 'approved' ? 'Yêu cầu nghỉ của bạn đã được chấp nhận' : 'Yêu cầu nghỉ của bạn đã bị từ chối',
                    time: new Date().toISOString(),
                    read: false
                });
                StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
            }
            
            // Render lại calendar
            if (typeof renderAdminCalendars === 'function') {
                renderAdminCalendars();
            }
            
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            openLeaveRequestListModal();
            updateLeaveRequestListBadge();
            updateNotifCount();
        }
        
        // Cập nhật badge cảnh báo trên nút "Danh sách duyệt nghỉ phép"
        function updateLeaveRequestListBadge() {
            const btn = document.getElementById('leaveRequestListBtn');
            if (!btn) return;
            
            // Xóa badge cũ nếu có
            const oldBadge = btn.querySelector('.leave-request-badge');
            if (oldBadge) {
                oldBadge.remove();
            }
            
            // Lấy khoảng ngày từ lịch
            const dateRange = getCalendarDateRange();
            
            // Lọc submissions theo khoảng ngày và trạng thái pending
            const pendingRequests = submissions.filter(s => {
                if (!s.date || s.status !== 'pending') return false;
                return s.date >= dateRange.startKey && s.date <= dateRange.endKey;
            });
            
            // Lọc các yêu cầu mà user có quyền duyệt
            let pendingForUser = [];
            if (currentUser && currentUser.role === 'admin') {
                pendingForUser = pendingRequests;
            } else if (currentUser && currentUser.role === 'doctor') {
                pendingForUser = pendingRequests.filter(req => {
                    const doctorKey = req.doctorKey || normalizeKey(req.doctorName || '');
                    const doctorColumn = getDoctorColumn(doctorKey);
                    if (!doctorColumn) return false;
                    return hasPermissionForDuyetNghiPhepColumn(doctorColumn);
                });
            }
            
            // Nếu có yêu cầu chưa duyệt, thêm badge
            if (pendingForUser.length > 0) {
                const badge = document.createElement('span');
                badge.className = 'leave-request-badge';
                badge.textContent = pendingForUser.length;
                badge.style.position = 'absolute';
                badge.style.top = '-8px';
                badge.style.right = '-8px';
                badge.style.background = '#e74c3c';
                badge.style.color = '#fff';
                badge.style.borderRadius = '50%';
                badge.style.width = '24px';
                badge.style.height = '24px';
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                badge.style.fontSize = '12px';
                badge.style.fontWeight = 'bold';
                badge.style.border = '2px solid #fff';
                badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                badge.title = `${pendingForUser.length} yêu cầu nghỉ phép chờ duyệt`;
                btn.appendChild(badge);
            }
        }
        
        // Format ngày tháng
        function formatDate(dateStr) {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr + 'T00:00:00');
                const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                const dayName = days[date.getDay()];
                return `${dayName}, ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            } catch (e) {
                return dateStr;
            }
        }
        
        // Format ngày giờ
        function formatDateTime(dateTimeStr) {
            if (!dateTimeStr) return '';
            try {
                const date = new Date(dateTimeStr);
                return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            } catch (e) {
                return dateTimeStr;
            }
        }
        
        // Lưu cài đặt lịch nghỉ cố định
        function saveFixedScheduleSettings() {
            const weekdays = [1, 2, 3, 4, 5, 6]; // Thứ 2 - Thứ 7
            const columns = ['ld', 'c1', 'c2', 'c3'];
            
            columns.forEach(col => {
                weekdays.forEach(day => {
                    const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-column="${col}"][data-weekday="${day}"]:checked`);
                    const selectedDoctors = [];
                    
                    checkboxes.forEach(checkbox => {
                        const doctorKey = checkbox.value;
                        const periodRadio = document.querySelector(`input[name="fixedPeriod_${col}_${day}_${doctorKey}"]:checked`);
                        const period = periodRadio ? periodRadio.value : 'full';
                        selectedDoctors.push({ key: doctorKey, period: period });
                    });
                    
                    if (!fixedScheduleData[col]) {
                        fixedScheduleData[col] = {};
                    }
                    fixedScheduleData[col][day] = selectedDoctors;
                });
            });
            
            saveFixedScheduleData();
            closeFixedScheduleModal();
            alert('✅ Đã lưu lịch nghỉ cố định.');
            // Render lại calendar để áp dụng lịch nghỉ cố định
            if (typeof renderAdminCalendars === 'function') {
                renderAdminCalendars();
            }
            if (typeof renderNghiPhepCalendars === 'function') {
                renderNghiPhepCalendars();
            }
        }
        
        // Save data to localStorage
        function saveQuanLyNghiPhepData() {
            StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // Initialize calendars when needed
        function initCalendars() {
            // load submissions from storage
            submissions = StorageUtil.loadJson(STORAGE_KEYS.leaveSubmissions, []);
            // cleanup old submissions older than 2 months
            cleanupOldSubmissions();
            // Đã bỏ lịch đăng ký nghỉ phép khỏi trang chủ
            // renderThreeMonthCalendars('calendarContainer', onUserDateClick);
            if (currentUser && currentUser.role === 'admin') renderAdminCalendars();
            // Hiển thị danh sách lãnh đạo trên Trang chủ (block #trangchuLanhdaoList)
            if (typeof renderTrangChuLanhDaoList === 'function') renderTrangChuLanhDaoList();
        }

        function cleanupOldSubmissions() {
            if (!Array.isArray(submissions)) submissions = [];
            const now = new Date();
            const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
            const cutoffKey = cutoff.toISOString().split('T')[0];
            const before = submissions.length;
            submissions = submissions.filter(s => (s.date || '') >= cutoffKey);
            if (submissions.length !== before) {
                StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            }
        }

        // ensure calendars render after UI shows
        setTimeout(() => { initCalendars(); }, 300);

        function copyDebugInfo() {
            const output = document.getElementById('debugOutput');
            if (!output) return;
            navigator.clipboard?.writeText(output.textContent || '')
                .then(() => alert('Đã sao chép debug data vào clipboard'))
                .catch(() => alert('Không thể sao chép (trình duyệt không hỗ trợ)'));
        }

        function clearDebugOutput() {
            const output = document.getElementById('debugOutput');
            if (!output) return;
            output.textContent = '';
        }

        // ========== cv cột1 Functions ==========
        
        // Get available doctors for cv cột1 (from cột1)
        function getAvailableDoctorsForcvcot1(currentRowId) {
            const cot1Doctors = doctors.cot1 || [];
            
            // Get already selected doctors (excluding current row)
            const selectedDoctors = cvcot1Data
                .filter(row => row.id !== currentRowId && row.doctor && row.doctor.trim() !== '')
                .map(row => row.doctor.trim());
            
            // Filter out already selected doctors (dùng tên hiển thị)
            return cot1Doctors.filter(doc => {
                const doctorName = doc.displayName || doc.name || '';
                return !selectedDoctors.includes(doctorName.trim());
            });
        }
        
        // Initialize cv cột1 table
        function initcvcot1Table() {
            rendercvcot1Table();
        }
        
        // Render cv cột1 table
        function rendercvcot1Table() {
            const tbody = document.getElementById('cvcot1TableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            cvcot1Data.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                // Get available doctors for this row
                const availableDoctors = getAvailableDoctorsForcvcot1(row.id);
                const currentDoctor = row.doctor || '';
                
                // Build select options (dùng tên hiển thị)
                let selectOptions = '<option value="">-- Chọn bác sĩ --</option>';
                availableDoctors.forEach(doc => {
                    const doctorName = doc.displayName || doc.name || '';
                    const selected = currentDoctor === doctorName ? 'selected' : '';
                    selectOptions += `<option value="${doctorName}" ${selected}>${doctorName}</option>`;
                });
                
                // If current doctor is selected but not in available list (already selected elsewhere), add it back
                if (currentDoctor && !availableDoctors.find(doc => (doc.displayName || doc.name || '') === currentDoctor)) {
                    selectOptions += `<option value="${currentDoctor}" selected>${currentDoctor} (đã chọn)</option>`;
                }
                
                const hasEditPermission = hasPermission('cvcot1');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deletecvcot1Row(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <select 
                               ${disabledAttr}
                               onchange="updatecvcot1Row(${row.id}, 'doctor', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                            ${selectOptions}
                        </select>
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.work || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập công việc cụ thể"
                               onchange="updatecvcot1Row(${row.id}, 'work', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addcvcot1Row() {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            cvcot1Data.push({
                id: Date.now(),
                doctor: '',
                work: ''
            });
            savecvcot1Data();
            rendercvcot1Table();
        }

        // Delete row
        function deletecvcot1Row(id) {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                cvcot1Data = cvcot1Data.filter(row => row.id !== id);
                savecvcot1Data();
                rendercvcot1Table();
            }
        }

        // Update row data
        function updatecvcot1Row(id, field, value) {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = cvcot1Data.find(r => r.id === id);
            if (row) {
                row[field] = value;
                savecvcot1Data();
                // Re-render table to update available doctors in other rows
                if (field === 'doctor') {
                    rendercvcot1Table();
                }
            }
        }

        // Save data to localStorage
        function savecvcot1Data() {
            localStorage.setItem('cvcot1Data', JSON.stringify(cvcot1Data));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== cv cột2+3Table Management ==========
        // cvcot23Data đã được khai báo ở trên khi load trang

        // Initialize cv cột2+3table with 10 rows if empty
        function initcvcot23Table() {
            if (cvcot23Data.length === 0) {
                for (let i = 0; i < 10; i++) {
                    cvcot23Data.push({
                        id: Date.now() + i,
                        doctor: '',
                        work: ''
                    });
                }
                savecvcot23Data();
            }
            rendercvcot23Table();
        }

        // Get available doctors from cột2 và cột3, excluding already selected ones
        function getAvailableDoctorsForcvcot23(currentRowId) {
            // Get doctors from cột2 và cột3
            const cot2Doctors = doctors.cot2 || [];
            const cot3Doctors = doctors.cot3 || [];
            
            // Combine both lists, avoiding duplicates
            const allDoctors = [];
            const seenNames = new Set();
            
            [...cot2Doctors, ...cot3Doctors].forEach(doc => {
                const doctorName = (doc.displayName || doc.name || '').trim();
                if (doctorName && !seenNames.has(doctorName)) {
                    seenNames.add(doctorName);
                    allDoctors.push(doc);
                }
            });
            
            // Get already selected doctors (excluding current row)
            const selectedDoctors = cvcot23Data
                .filter(row => row.id !== currentRowId && row.doctor && row.doctor.trim() !== '')
                .map(row => row.doctor.trim());
            
            // Filter out already selected doctors (dùng tên hiển thị)
            return allDoctors.filter(doc => {
                const doctorName = doc.displayName || doc.name || '';
                return !selectedDoctors.includes(doctorName.trim());
            });
        }

        // Render cv cột2+3table
        function rendercvcot23Table() {
            const tbody = document.getElementById('cvcot23TableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            cvcot23Data.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                // Get available doctors for this row
                const availableDoctors = getAvailableDoctorsForcvcot23(row.id);
                const currentDoctor = row.doctor || '';
                
                // Build select options (dùng tên hiển thị)
                let selectOptions = '<option value="">-- Chọn bác sĩ --</option>';
                availableDoctors.forEach(doc => {
                    const doctorName = doc.displayName || doc.name || '';
                    const selected = currentDoctor === doctorName ? 'selected' : '';
                    selectOptions += `<option value="${doctorName}" ${selected}>${doctorName}</option>`;
                });
                
                // If current doctor is selected but not in available list (already selected elsewhere), add it back
                if (currentDoctor && !availableDoctors.find(doc => (doc.displayName || doc.name || '') === currentDoctor)) {
                    selectOptions += `<option value="${currentDoctor}" selected>${currentDoctor} (đã chọn)</option>`;
                }
                
                const hasEditPermission = hasPermission('cvcot23');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                // Style cho disabled: nền trắng, text đậm, rõ ràng như admin
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deletecvcot23Row(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <select 
                               ${disabledAttr}
                               onchange="updatecvcot23Row(${row.id}, 'doctor', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                            ${selectOptions}
                        </select>
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${row.work || ''}" 
                               placeholder="Nhập công việc cụ thể"
                               onchange="updatecvcot23Row(${row.id}, 'work', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addcvcot23Row() {
            if (!hasPermission('cvcot23')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            cvcot23Data.push({
                id: Date.now(),
                doctor: '',
                work: ''
            });
            savecvcot23Data();
            rendercvcot23Table();
        }

        // Delete row
        function deletecvcot23Row(id) {
            if (!hasPermission('cvcot23')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                cvcot23Data = cvcot23Data.filter(row => row.id !== id);
                savecvcot23Data();
                rendercvcot23Table();
            }
        }

        // Update row data
        function updatecvcot23Row(id, field, value) {
            if (!hasPermission('cvcot23')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = cvcot23Data.find(r => r.id === id);
            if (row) {
                row[field] = value;
                savecvcot23Data();
                // Re-render table to update available doctors in other rows
                if (field === 'doctor') {
                    rendercvcot23Table();
                }
            }
        }

        // Save data to localStorage
        function savecvcot23Data() {
            localStorage.setItem('cvcot23Data', JSON.stringify(cvcot23Data));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== cv cột1 Functions ==========
        
        // cvcot1Data đã được khai báo ở trên khi load trang

        // Initialize cv cột1 table with 10 rows if empty
        function initcvcot1Table() {
            if (cvcot1Data.length === 0) {
                for (let i = 0; i < 10; i++) {
                    cvcot1Data.push({
                        id: Date.now() + i,
                        doctor: '',
                        work: ''
                    });
                }
                savecvcot1Data();
            }
            rendercvcot1Table();
        }

        // Get available doctors from cột1, excluding already selected ones
        function getAvailableDoctorsForcvcot1(currentRowId) {
            // Get doctors from cột1
            const cot1Doctors = doctors.cot1 || [];
            
            // Get already selected doctors (excluding current row)
            const selectedDoctors = cvcot1Data
                .filter(row => row.id !== currentRowId && row.doctor && row.doctor.trim() !== '')
                .map(row => row.doctor.trim());
            
            // Filter out already selected doctors (dùng tên hiển thị)
            return cot1Doctors.filter(doc => {
                const doctorName = doc.displayName || doc.name || '';
                return !selectedDoctors.includes(doctorName.trim());
            });
        }

        // Render cv cột1 table
        function rendercvcot1Table() {
            const tbody = document.getElementById('cvcot1TableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            cvcot1Data.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                // Get available doctors for this row
                const availableDoctors = getAvailableDoctorsForcvcot1(row.id);
                const currentDoctor = row.doctor || '';
                
                // Build select options (dùng tên hiển thị)
                let selectOptions = '<option value="">-- Chọn bác sĩ --</option>';
                availableDoctors.forEach(doc => {
                    const doctorName = doc.displayName || doc.name || '';
                    const selected = currentDoctor === doctorName ? 'selected' : '';
                    selectOptions += `<option value="${doctorName}" ${selected}>${doctorName}</option>`;
                });
                
                // If current doctor is selected but not in available list (already selected elsewhere), add it back
                if (currentDoctor && !availableDoctors.find(doc => (doc.displayName || doc.name || '') === currentDoctor)) {
                    selectOptions += `<option value="${currentDoctor}" selected>${currentDoctor} (đã chọn)</option>`;
                }
                
                const hasEditPermission = hasPermission('cvcot1');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                // Style cho disabled: nền trắng, text đậm, rõ ràng như admin
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deletecvcot1Row(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <select 
                               ${disabledAttr}
                               onchange="updatecvcot1Row(${row.id}, 'doctor', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                            ${selectOptions}
                        </select>
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.work || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập công việc cụ thể"
                               onchange="updatecvcot1Row(${row.id}, 'work', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addcvcot1Row() {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            cvcot1Data.push({
                id: Date.now(),
                doctor: '',
                work: ''
            });
            savecvcot1Data();
            rendercvcot1Table();
        }

        // Delete row
        function deletecvcot1Row(id) {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                cvcot1Data = cvcot1Data.filter(row => row.id !== id);
                savecvcot1Data();
                rendercvcot1Table();
            }
        }

        // Update row data
        function updatecvcot1Row(id, field, value) {
            if (!hasPermission('cvcot1')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = cvcot1Data.find(r => r.id === id);
            if (row) {
                row[field] = value;
                savecvcot1Data();
                // Re-render table to update available doctors in other rows
                if (field === 'doctor') {
                    rendercvcot1Table();
                }
            }
        }

        // Save data to localStorage
        function savecvcot1Data() {
            localStorage.setItem('cvcot1Data', JSON.stringify(cvcot1Data));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Khám hỗ trợ PK Functions ==========
        
        // Initialize Khám hỗ trợ PK table
        function initKhamHoTroPKTable() {
            renderKhamHoTroPKTable();
        }

        // Render Khám hỗ trợ PK table
        function renderKhamHoTroPKTable() {
            const tbody = document.getElementById('khamhotropkTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            if (khamhotropkData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">Chưa có dữ liệu. Nhấn "Thêm dòng mới" để bắt đầu.</td></tr>';
                return;
            }
            
            khamhotropkData.forEach((row) => {
                const tr = document.createElement('tr');
                
                const hasEditPermission = hasPermission('khamhotropk');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deleteKhamHoTroPKRow(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.doctorName || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập tên bác sĩ"
                               onchange="updateKhamHoTroPKRow(${row.id}, 'doctorName', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.content || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập nội dung hỗ trợ PK"
                               onchange="updateKhamHoTroPKRow(${row.id}, 'content', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addKhamHoTroPKRow() {
            if (!hasPermission('khamhotropk')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            khamhotropkData.push({
                id: Date.now(),
                doctorName: '',
                content: ''
            });
            saveKhamHoTroPKData();
            renderKhamHoTroPKTable();
        }

        // Delete row
        function deleteKhamHoTroPKRow(id) {
            if (!hasPermission('khamhotropk')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                khamhotropkData = khamhotropkData.filter(row => row.id !== id);
                saveKhamHoTroPKData();
                renderKhamHoTroPKTable();
            }
        }

        // Update row data
        function updateKhamHoTroPKRow(id, field, value) {
            if (!hasPermission('khamhotropk')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = khamhotropkData.find(r => r.id === id);
            if (row) {
                row[field] = value;
                saveKhamHoTroPKData();
            }
        }

        // Save data to localStorage
        function saveKhamHoTroPKData() {
            localStorage.setItem('khamhotropkData', JSON.stringify(khamhotropkData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch khám sớm Functions ==========
        
        // Initialize Lịch khám sớm calendar
        function initKhamSomCalendar() {
            renderKhamSomCalendar();
        }

        // Render Lịch khám sớm calendar - 5 tháng (chu kỳ 25-24)
        function renderKhamSomCalendar() {
            const container = document.getElementById('khamsomCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const numCycles = 5;
            container.innerHTML = '';
            container.style.display = 'flex';
            container.style.gap = '20px';
            container.style.flexWrap = 'wrap';
            container.style.maxWidth = '100%';
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderKhamSomMonthCycle(cycleStart, cycleEnd);
                container.appendChild(monthEl);
            }
            updateAddButtonsVisibility();
        }
        function renderKhamSomMonthCycle(cycleStart, cycleEnd) {
            const month = document.createElement('div');
            month.style.cssText = 'flex: 0 1 100%; width: 100%; min-width: 100%; max-width: 100%; background: #fff; border-radius: 10px; padding: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);';
            const title = document.createElement('div');
            title.style.cssText = 'text-align: center; font-weight: 700; margin-bottom: 8px;';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            const startMonth = cycleStart.toLocaleString('vi-VN', {month:'long', year:'numeric'});
            const endMonth = cycleEnd.toLocaleString('vi-VN', {month:'long', year:'numeric'});
            title.textContent = `Lịch khám sớm tháng ${monthNum}/${year} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
            month.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(7,1fr); gap: 8px;';
            ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.cssText = 'text-align: center; font-size: 14px; color: #666;';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            for (let i = 0; i < startOffset; i++) {
                const empty = document.createElement('div');
                grid.appendChild(empty);
            }
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const todayForCompare = new Date();
            todayForCompare.setHours(0, 0, 0, 0);
            allDates.forEach(date => {
                        const dateStr = formatDateForStorage(date);
                const isPast = date < todayForCompare;
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && date.getMonth() === todayForCompare.getMonth() && date.getDate() === todayForCompare.getDate();
                const isHolidaySom = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                const doctorName = (khamsomData[dateStr] || '').replace(/"/g, '&quot;');
                        const hasEditPermission = hasPermission('khamsom');
                        const shouldDisable = isPast || !hasEditPermission;
                        const disabledAttr = shouldDisable ? 'disabled' : '';
                        const disabledStyle = shouldDisable ? 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;' : '';
                const dayCell = document.createElement('div');
                dayCell.style.cssText = `border: ${isToday ? '3px solid #ffc107' : '1px solid #e6e9ef'}; border-radius: 6px; padding: 8px; background: ${isHolidaySom ? '#d32f2f' : (isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#f8fafc'))}; min-height: 80px; display: flex; flex-direction: column; gap: 4px;`;
                if (isHolidaySom) dayCell.style.color = '#fff';
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.cssText = 'font-size: 12px; font-weight: 600;';
                dayCell.appendChild(dayLabel);
                        if (isHolidaySom) {
                    const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.cssText = 'font-size: 11px; margin-bottom: 4px; font-weight: 500;';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.value = khamsomData[dateStr] || '';
                input.placeholder = 'Bác sĩ';
                input.setAttribute('data-date', dateStr);
                if (shouldDisable) input.disabled = true;
                input.style.cssText = 'padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                input.onchange = function() { updateKhamSomDate(dateStr, this.value); };
                dayCell.appendChild(input);
                grid.appendChild(dayCell);
            });
            month.appendChild(grid);
            return month;
        }

        // Format date for storage (YYYY-MM-DD)
        function formatDateForStorage(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Format date for display (DD/MM)
        function formatDateForDisplay(date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        }
        
        // Format ngày với tháng và thứ trong tuần: "10/2 (thứ 3)"
        function formatDateWithWeekday(date) {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const weekday = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
            
            const weekdayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const weekdayName = weekdayNames[weekday];
            
            return `${day}/${month} (${weekdayName})`;
        }

        // Check if two dates are the same day
        function isSameDay(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        }

        // Update doctor name for a specific date
        function updateKhamSomDate(dateStr, doctorName) {
            // Kiểm tra ngày đã qua
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateObj = new Date(dateStr + 'T00:00:00');
            if (dateObj < today) {
                alert('Không thể chỉnh sửa ngày đã qua.');
                // Restore previous value
                const input = document.querySelector(`#khamsomCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = khamsomData[dateStr] || '';
                }
                return;
            }
            
            if (!hasPermission('khamsom')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                // Restore previous value
                const input = document.querySelector(`#khamsomCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = khamsomData[dateStr] || '';
                }
                return;
            }
            
            if (doctorName && doctorName.trim()) {
                khamsomData[dateStr] = doctorName.trim();
            } else {
                delete khamsomData[dateStr];
            }
            
            saveKhamSomData();
        }

        // Save data to localStorage
        function saveKhamSomData() {
            localStorage.setItem('khamsomData', JSON.stringify(khamsomData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            // Tự động cập nhật lịch làm việc nếu đang mở tab đó
            const lichlamviecTab = document.getElementById('lichlamviec');
            if (lichlamviecTab && lichlamviecTab.style.display !== 'none') {
                setTimeout(() => {
                    if (typeof renderLichlamviecTable === 'function') {
                        renderLichlamviecTable();
                    }
                }, 100);
            }
        }

        // ========== Lịch khám Cầu Giấy (6 phòng, 5 tháng) ==========
        function getKhamCauGiayDoctorOptions() {
            if (Array.isArray(khamcaugiayDoctorList) && khamcaugiayDoctorList.length > 0) {
                return khamcaugiayDoctorList.map(n => (typeof n === 'object' ? (n.name || n.displayName || '') : n)).filter(Boolean);
            }
            const all = [...(doctors.cot1 || []), ...(doctors.cot2 || []), ...(doctors.cot3 || []), ...(doctors.lanhdao || []), ...(doctors.partime || []), ...(doctors.khac || [])];
            return [...new Set(all.map(d => d.displayName || d.name || '').filter(Boolean))];
        }
        function getKhamCauGiayBaoHiemSixMonths() {
            const now = new Date();
            const list = [];
            for (let i = 0; i < 6; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                list.push({
                    key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
                    label: (d.getMonth() + 1) + '/' + d.getFullYear()
                });
            }
            return list;
        }
        function openKhamCauGiayDoctorListModal() {
            if (!hasPermission('khamcaugiay') && currentUser?.role !== 'admin') return;
            const container = document.getElementById('khamCauGiayDoctorListContainer');
            if (!container) return;
            container.innerHTML = '';
            const allDoctors = [...(doctors.cot1 || []), ...(doctors.cot2 || []), ...(doctors.cot3 || []), ...(doctors.lanhdao || []), ...(doctors.partime || []), ...(doctors.khac || [])];
            const selectedSet = new Set((khamcaugiayDoctorList || []).map(n => normalizeKey(typeof n === 'object' ? (n.name || n.displayName || '') : n)));
            const sixMonths = getKhamCauGiayBaoHiemSixMonths();
            const baoHiemByDoctor = khamcaugiayBaoHiem || {};
            allDoctors.forEach(doc => {
                const name = doc.displayName || doc.name || '';
                if (!name) return;
                const key = normalizeKey(name);
                const docBlock = document.createElement('div');
                docBlock.style.cssText = 'margin-bottom:14px;padding:10px;background:#fff;border:1px solid #e9ecef;border-radius:8px;';
                const row1 = document.createElement('label');
                row1.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;font-weight:600;';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = selectedSet.has(key) || (khamcaugiayDoctorList.length === 0 && selectedSet.size === 0);
                input.setAttribute('data-doctor-name', name);
                input.setAttribute('data-doctor-key', key);
                row1.appendChild(input);
                row1.appendChild(document.createTextNode(name));
                docBlock.appendChild(row1);
                const row2 = document.createElement('div');
                row2.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;font-size:12px;margin-left:24px;';
                row2.appendChild(document.createTextNode('Có đăng ký khám bảo hiểm (tick tháng):'));
                const monthsSet = new Set(Array.isArray(baoHiemByDoctor[key]) ? baoHiemByDoctor[key] : []);
                sixMonths.forEach(m => {
                    const lbl = document.createElement('label');
                    lbl.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;';
                    const chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.setAttribute('data-doctor-key', key);
                    chk.setAttribute('data-month', m.key);
                    chk.checked = monthsSet.has(m.key);
                    lbl.appendChild(chk);
                    lbl.appendChild(document.createTextNode(m.label));
                    row2.appendChild(lbl);
                });
                docBlock.appendChild(row2);
                container.appendChild(docBlock);
            });
            document.getElementById('khamCauGiayDoctorListModal').classList.add('active');
        }
        function closeKhamCauGiayDoctorListModal() {
            document.getElementById('khamCauGiayDoctorListModal')?.classList.remove('active');
        }
        function saveKhamCauGiayDoctorList() {
            const container = document.getElementById('khamCauGiayDoctorListContainer');
            const listCheckboxes = container ? container.querySelectorAll('input[type="checkbox"][data-doctor-name]:checked') : [];
            khamcaugiayDoctorList = Array.from(listCheckboxes).map(cb => cb.getAttribute('data-doctor-name'));
            const monthCheckboxes = container ? container.querySelectorAll('input[type="checkbox"][data-doctor-key][data-month]') : [];
            const newBaoHiem = {};
            monthCheckboxes.forEach(cb => {
                const dkey = cb.getAttribute('data-doctor-key');
                const month = cb.getAttribute('data-month');
                if (!dkey || !month) return;
                if (!newBaoHiem[dkey]) newBaoHiem[dkey] = [];
                if (cb.checked) newBaoHiem[dkey].push(month);
            });
            Object.keys(newBaoHiem).forEach(k => newBaoHiem[k].sort());
            khamcaugiayBaoHiem = newBaoHiem;
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayDoctorList, khamcaugiayDoctorList);
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayBaoHiem, khamcaugiayBaoHiem);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeKhamCauGiayDoctorListModal();
            renderKhamCauGiayCalendar();
            alert('✅ Đã lưu danh sách bác sĩ khám Cầu Giấy và đăng ký khám bảo hiểm.');
        }
        function getKhamCauGiaySlotData(dayData, roomId, dateStr) {
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (d.getDay() === 0 && lamviechangngayData[dateStr]) {
                    const doc = (lamviechangngayData[dateStr]['caugiay_' + roomId] || '').trim();
                    return { doctor: doc, khamTrua: false, kham20h: false };
                }
            }
            if (dayData && dayData.sundayDoctor !== undefined && dayData.sundayDoctor !== null)
                return { doctor: (dayData.sundayDoctor || '').trim(), khamTrua: false, kham20h: false };
            const v = dayData && dayData[roomId];
            if (v == null) return { doctor: '', khamTrua: false, kham20h: false };
            if (typeof v === 'string') return { doctor: v || '', khamTrua: false, kham20h: false };
            return { doctor: (v.doctor || '').trim(), khamTrua: !!v.khamTrua, kham20h: !!v.kham20h };
        }
        function openKhamCauGiayRoomsModal() {
            if (!hasPermission('khamcaugiay') && currentUser?.role !== 'admin') return;
            const container = document.getElementById('khamCauGiayRoomsList');
            if (!container) return;
            container.innerHTML = '';
            (khamcaugiayRooms || []).forEach((room) => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                const khamTruaChecked = room.khamTrua ? 'checked' : '';
                const kham20hChecked = room.kham20h ? 'checked' : '';
                div.innerHTML = `
                    <input type="text" value="${(room.name || '').replace(/"/g, '&quot;')}" data-room-id="${room.id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${room.id}" data-opt="khamTrua" ${khamTruaChecked}>
                        Khám trưa
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${room.id}" data-opt="kham20h" ${kham20hChecked}>
                        Khám 20h
                    </label>
                    <button class="delete-btn" onclick="removeKhamCauGiayRoom('${room.id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            });
            document.getElementById('khamCauGiayRoomsModal').classList.add('active');
        }
        function closeKhamCauGiayRoomsModal() {
            document.getElementById('khamCauGiayRoomsModal')?.classList.remove('active');
        }
        function addKhamCauGiayRoom() {
            const id = 'r' + (Date.now().toString(36));
            khamcaugiayRooms.push({ id, name: 'Phòng mới', khamTrua: false, kham20h: false });
            const container = document.getElementById('khamCauGiayRoomsList');
            if (container) {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                div.innerHTML = `
                    <input type="text" value="Phòng mới" data-room-id="${id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${id}" data-opt="khamTrua">
                        Khám trưa
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${id}" data-opt="kham20h">
                        Khám 20h
                    </label>
                    <button class="delete-btn" onclick="removeKhamCauGiayRoom('${id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            }
        }
        function removeKhamCauGiayRoom(roomId) {
            collectKhamCauGiayRoomsFromDOM();
            khamcaugiayRooms = khamcaugiayRooms.filter(r => r.id !== roomId);
            for (const key in khamcaugiayData) {
                if (khamcaugiayData[key] && khamcaugiayData[key][roomId]) {
                    delete khamcaugiayData[key][roomId];
                }
            }
            const container = document.getElementById('khamCauGiayRoomsList');
            if (!container) return;
            container.innerHTML = '';
            (khamcaugiayRooms || []).forEach((room) => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                const khamTruaChecked = room.khamTrua ? 'checked' : '';
                const kham20hChecked = room.kham20h ? 'checked' : '';
                div.innerHTML = `
                    <input type="text" value="${(room.name || '').replace(/"/g, '&quot;')}" data-room-id="${room.id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${room.id}" data-opt="khamTrua" ${khamTruaChecked}>
                        Khám trưa
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                        <input type="checkbox" data-room-id="${room.id}" data-opt="kham20h" ${kham20hChecked}>
                        Khám 20h
                    </label>
                    <button class="delete-btn" onclick="removeKhamCauGiayRoom('${room.id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            });
        }
        function collectKhamCauGiayRoomsFromDOM() {
            const container = document.getElementById('khamCauGiayRoomsList');
            if (!container) return;
            container.querySelectorAll('input[type="text"]').forEach(inp => {
                const rid = inp.getAttribute('data-room-id');
                const r = khamcaugiayRooms.find(x => x.id === rid);
                if (r) r.name = (inp.value || '').trim() || r.name;
            });
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const rid = cb.getAttribute('data-room-id');
                const opt = cb.getAttribute('data-opt');
                const r = khamcaugiayRooms.find(x => x.id === rid);
                if (r && opt === 'khamTrua') r.khamTrua = !!cb.checked;
                if (r && opt === 'kham20h') r.kham20h = !!cb.checked;
            });
        }
        function saveKhamCauGiayRooms() {
            collectKhamCauGiayRoomsFromDOM();
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayRooms, khamcaugiayRooms);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeKhamCauGiayRoomsModal();
            renderKhamCauGiayCalendar();
            alert('✅ Đã lưu danh sách phòng khám.');
        }

        // ========== Phòng khám Long Biên ==========
        function openKhamLongBienRoomsModal() {
            if (!hasPermission('khamlongbien') && currentUser?.role !== 'admin') return;
            const container = document.getElementById('khamLongBienRoomsList');
            if (!container) return;
            container.innerHTML = '';
            (khamlongbienRooms || []).forEach((room) => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                div.innerHTML = `
                    <input type="text" value="${(room.name || '').replace(/"/g, '&quot;')}" data-room-id="${room.id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <button class="delete-btn" onclick="removeKhamLongBienRoom('${room.id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            });
            document.getElementById('khamLongBienRoomsModal')?.classList.add('active');
        }
        function closeKhamLongBienRoomsModal() {
            document.getElementById('khamLongBienRoomsModal')?.classList.remove('active');
        }
        function addKhamLongBienRoom() {
            const id = 'r' + (Date.now().toString(36));
            khamlongbienRooms.push({ id, name: 'Phòng mới' });
            const container = document.getElementById('khamLongBienRoomsList');
            if (container) {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                div.innerHTML = `
                    <input type="text" value="Phòng mới" data-room-id="${id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <button class="delete-btn" onclick="removeKhamLongBienRoom('${id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            }
        }
        function collectKhamLongBienRoomsFromDOM() {
            const container = document.getElementById('khamLongBienRoomsList');
            if (!container) return;
            container.querySelectorAll('input[type="text"]').forEach(inp => {
                const rid = inp.getAttribute('data-room-id');
                const r = khamlongbienRooms.find(x => x.id === rid);
                if (r) r.name = (inp.value || '').trim() || r.name;
            });
        }
        function removeKhamLongBienRoom(roomId) {
            collectKhamLongBienRoomsFromDOM();
            khamlongbienRooms = khamlongbienRooms.filter(r => r.id !== roomId);
            // Xóa dữ liệu lịch khám tương ứng phòng này
            for (const dateKey in khamlongbienData) {
                const day = khamlongbienData[dateKey];
                if (day && day.rooms && day.rooms[roomId]) {
                    delete day.rooms[roomId];
                }
            }
            const container = document.getElementById('khamLongBienRoomsList');
            if (!container) return;
            container.innerHTML = '';
            (khamlongbienRooms || []).forEach((room) => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                div.innerHTML = `
                    <input type="text" value="${(room.name || '').replace(/"/g, '&quot;')}" data-room-id="${room.id}" 
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <button class="delete-btn" onclick="removeKhamLongBienRoom('${room.id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            });
        }
        function saveKhamLongBienRooms() {
            collectKhamLongBienRoomsFromDOM();
            StorageUtil.saveJson(STORAGE_KEYS.khamlongbienRooms, khamlongbienRooms);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeKhamLongBienRoomsModal();
            renderKhamLongBienCalendar();
            alert('✅ Đã lưu danh sách phòng khám Long Biên.');
        }
        function initKhamCauGiayCalendar() {
            renderKhamCauGiayCalendar();
        }
        function renderKhamCauGiayCalendar() {
            const container = document.getElementById('khamcaugiayCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const hasEditPermission = hasPermission('khamcaugiay') || currentUser?.role === 'admin';
            const doctorOptions = getKhamCauGiayDoctorOptions();
            container.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.className = 'calendar-month-card';
                monthEl.style.cssText = 'flex:0 1 100%;width:100%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;';
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                const title = document.createElement('div');
                title.style.cssText = 'text-align:center;font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = `Lịch khám Cầu Giấy tháng ${monthNum}/${year}`;
                monthEl.appendChild(title);
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:10px;';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.cssText = 'text-align:center;font-size:14px;color:#666;';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });
                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) grid.appendChild(document.createElement('div'));
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const todayKey = toLocalDateKey(today);
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const isPastDate = key < todayKey;
                    const dayData = khamcaugiayData[key] || {};
                    const excludeKeys = getDoctorsOnLeaveForDate(key);
                    const ldName = getLĐFromTructhuongtru(key);
                    const lichTrucDay = lichTrucData[key] || {};
                    const lichNghiText = (() => {
                        const parts = [];
                        ['ld','c1','c2','c3'].forEach(col => {
                            const cd = (quanlynghiphepData[key] || {})[col];
                            const fixedObj = new Date(key + 'T00:00:00');
                            const wd = fixedObj.getDay();
                            const wdKey = wd === 0 ? 7 : wd;
                            let doctors = [];
                            if (cd && Array.isArray(cd.doctors)) {
                                doctors = (cd.doctors || []).map(x => (x && x.key) ? getDoctorDisplayNameAnyColumn(x.key) : '').filter(Boolean);
                            } else if (wdKey >= 1 && wdKey <= 6) {
                                const fixed = getFixedScheduleForWeekday(col, wdKey);
                                doctors = fixed.map(f => getDoctorDisplayNameAnyColumn((f && f.key) || f)).filter(Boolean);
                            }
                            if (doctors.length) parts.push((col === 'ld' ? 'LĐ' : col.toUpperCase()) + ': ' + doctors.join(', '));
                        });
                        return parts.length ? parts.join(' | ') : '-';
                    })();
                    const lichTrucParts = [];
                    lichTrucParts.push('LĐ: ' + (ldName || '-'));
                    ['c1','c2','c3'].forEach(col => {
                        const cd = lichTrucDay[col] || {};
                        const dayName = cd.day ? (getDoctorDisplayNameAnyColumn(cd.day) || cd.day) : '';
                        const nightName = cd.night ? (getDoctorDisplayNameAnyColumn(cd.night) || cd.night) : '';
                        lichTrucParts.push('C' + col.slice(-1) + ': ' + (dayName || '-') + '/' + (nightName || '-'));
                    });
                    const wd = date.getDay();
                    if (wd === 6) {
                        const t1630 = lichTrucDay.truc1630 ? getDoctorDisplayNameAnyColumn(lichTrucDay.truc1630) : '';
                        lichTrucParts.push('16h30: ' + (t1630 || '-'));
                    }
                    const lichTrucText = lichTrucParts.join(' | ');
                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    dayCell.style.cssText = 'border:1px solid #e6e9ef;border-radius:6px;padding:8px;background:#f8fafc;min-height:200px;display:flex;flex-direction:column;gap:4px;';
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    if (isHoliday) { dayCell.style.background = '#d32f2f'; dayCell.style.color = '#fff'; }
                    if (isPastDate) { dayCell.style.opacity = '0.35'; dayCell.style.background = '#e9ecef'; dayCell.style.pointerEvents = 'none'; }
                    const dayLabel = document.createElement('div');
                    dayLabel.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:4px;';
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayCell.appendChild(dayLabel);
                    if (isHoliday) {
                        const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(key) : { label: '' };
                        if (hl.label) {
                            const hb = document.createElement('div');
                            hb.textContent = '🏮 ' + hl.label;
                            hb.style.fontSize = '11px';
                            dayCell.appendChild(hb);
                        }
                    }
                    const isSunday = wd === 0;
                    if (isSunday) {
                        // Chủ nhật: dùng phòng + dữ liệu từ tab Lịch khám chủ nhật (lamviechangngay)
                        const lvcnDay = lamviechangngayData[key] || {};
                        (lamviechangngayRoomsCauGiay || []).forEach(room => {
                            const currentVal = (lvcnDay['caugiay_' + room.id] || '').trim();
                            const row = document.createElement('div');
                            row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap;margin-bottom:4px;';
                            const lbl = document.createElement('span');
                            lbl.textContent = (room.name || room.id) + ':';
                            lbl.style.minWidth = '70px';
                            lbl.style.fontWeight = '600';
                            row.appendChild(lbl);
                            const sel = document.createElement('select');
                            sel.style.cssText = 'flex:1;min-width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                            sel.disabled = isPastDate || !hasEditPermission;
                            sel.innerHTML = '<option value="">--</option>' + doctorOptions.map(n => {
                                const k = normalizeKey(n);
                                if (excludeKeys.has(k)) return '';
                                return `<option value="${k}" ${normalizeKey(currentVal) === k ? 'selected' : ''}>${(n || '').replace(/"/g, '&quot;')}</option>`;
                            }).filter(Boolean).join('');
                            sel.onchange = () => {
                                updateLamviechangngaySlotDoctor(key, 'caugiay', room.id, sel.value);
                                renderKhamCauGiayCalendar();
                            };
                            row.appendChild(sel);
                            dayCell.appendChild(row);
                        });
                    } else {
                        (khamcaugiayRooms || []).forEach(room => {
                            const slot = getKhamCauGiaySlotData(dayData, room.id);
                            // Dòng trên: Tên phòng + 2 checkbox trưa và 20h (cùng 1 hàng)
                            const row1 = document.createElement('div');
                            row1.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:nowrap;margin-bottom:2px;';
                            const lbl = document.createElement('span');
                            lbl.textContent = (room.name || room.id) + ':';
                            lbl.style.minWidth = '60px';
                            lbl.style.flexShrink = '0';
                            lbl.style.fontWeight = '600';
                            row1.appendChild(lbl);
                            if (room.khamTrua) {
                                const cbTrua = document.createElement('label');
                                cbTrua.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;white-space:nowrap;flex-shrink:0;';
                                const inpTrua = document.createElement('input');
                                inpTrua.type = 'checkbox';
                                inpTrua.checked = slot.khamTrua;
                                inpTrua.disabled = isPastDate || !hasEditPermission;
                                inpTrua.onchange = () => updateKhamCauGiayRoomOption(key, room.id, 'khamTrua', inpTrua.checked);
                                cbTrua.appendChild(inpTrua);
                                cbTrua.appendChild(document.createTextNode('trưa'));
                                row1.appendChild(cbTrua);
                            }
                            if (room.kham20h) {
                                const cb20h = document.createElement('label');
                                cb20h.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;white-space:nowrap;flex-shrink:0;';
                                const inp20h = document.createElement('input');
                                inp20h.type = 'checkbox';
                                inp20h.checked = slot.kham20h;
                                inp20h.disabled = isPastDate || !hasEditPermission;
                                inp20h.onchange = () => updateKhamCauGiayRoomOption(key, room.id, 'kham20h', inp20h.checked);
                                cb20h.appendChild(inp20h);
                                cb20h.appendChild(document.createTextNode('20h'));
                                row1.appendChild(cb20h);
                            }
                            dayCell.appendChild(row1);
                            // Dòng dưới: Dropdown chọn bác sĩ
                            const row2 = document.createElement('div');
                            row2.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap;margin-bottom:4px;';
                            const selLabel = document.createElement('span');
                            selLabel.textContent = 'Bác sĩ:';
                            selLabel.style.minWidth = '70px';
                            selLabel.style.fontWeight = '600';
                            row2.appendChild(selLabel);
                            const sel = document.createElement('select');
                            sel.style.cssText = 'flex:1;min-width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                            sel.disabled = isPastDate || !hasEditPermission;
                            sel.innerHTML = '<option value="">--</option>' + doctorOptions.map(n => {
                                const k = normalizeKey(n);
                                if (excludeKeys.has(k)) return '';
                                return `<option value="${k}" ${k === slot.doctor ? 'selected' : ''}>${(n || '').replace(/"/g, '&quot;')}</option>`;
                            }).filter(Boolean).join('');
                            sel.onchange = () => updateKhamCauGiayRoom(key, room.id, sel.value);
                            row2.appendChild(sel);
                            dayCell.appendChild(row2);
                        });
                    }
                    const nghiRow = document.createElement('div');
                    nghiRow.style.cssText = 'font-size:10px;color:#666;margin-top:4px;padding-top:4px;border-top:1px dashed #ddd;';
                    nghiRow.innerHTML = '<strong>Lịch nghỉ:</strong> ' + lichNghiText;
                    dayCell.appendChild(nghiRow);
                    const trucRow = document.createElement('div');
                    trucRow.style.cssText = 'font-size:10px;color:#666;';
                    trucRow.innerHTML = '<strong>Lịch trực:</strong> ' + lichTrucText;
                    dayCell.appendChild(trucRow);
                    grid.appendChild(dayCell);
                });
                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        function updateKhamCauGiaySundayDoctor(dateStr, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamcaugiay') && currentUser?.role !== 'admin') return;
            const key = (doctorKey || '').trim();
            if (key) {
                khamcaugiayData[dateStr] = { sundayDoctor: key };
            } else {
                delete khamcaugiayData[dateStr];
            }
            saveKhamCauGiayData();
        }
        function updateKhamCauGiayRoom(dateStr, roomId, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamcaugiay') && currentUser?.role !== 'admin') return;
            const d = new Date(dateStr + 'T00:00:00');
            if (d.getDay() === 0) return;
            if (!khamcaugiayData[dateStr]) khamcaugiayData[dateStr] = {};
            const slot = getKhamCauGiaySlotData(khamcaugiayData[dateStr], roomId);
            if (doctorKey) {
                khamcaugiayData[dateStr][roomId] = { doctor: doctorKey, khamTrua: slot.khamTrua, kham20h: slot.kham20h };
            } else if (slot.khamTrua || slot.kham20h) {
                khamcaugiayData[dateStr][roomId] = { doctor: '', khamTrua: slot.khamTrua, kham20h: slot.kham20h };
            } else {
                delete khamcaugiayData[dateStr][roomId];
            }
            saveKhamCauGiayData();
        }
        function updateKhamCauGiayRoomOption(dateStr, roomId, opt, value) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamcaugiay') && currentUser?.role !== 'admin') return;
            const d = new Date(dateStr + 'T00:00:00');
            if (d.getDay() === 0) return;
            if (!khamcaugiayData[dateStr]) khamcaugiayData[dateStr] = {};
            const slot = getKhamCauGiaySlotData(khamcaugiayData[dateStr], roomId);
            if (opt === 'khamTrua') slot.khamTrua = !!value;
            if (opt === 'kham20h') slot.kham20h = !!value;
            if (slot.doctor || slot.khamTrua || slot.kham20h) {
                khamcaugiayData[dateStr][roomId] = slot;
            } else {
                delete khamcaugiayData[dateStr][roomId];
            }
            saveKhamCauGiayData();
        }
        function saveKhamCauGiayData() {
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            renderKhamCauGiayCalendar();
        }

        // ========== Xuất PDF lịch khám Cầu Giấy theo tuần ==========
        function openExportKhamCauGiayPDFModal() {
            const modal = document.getElementById('exportKhamCauGiayPDFModal');
            const dateInput = document.getElementById('exportKhamCauGiayDate');
            const preview = document.getElementById('exportKhamCauGiayWeekPreview');
            if (!modal || !dateInput) return;
            const today = new Date();
            dateInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (preview) updateExportKhamCauGiayWeekPreview();
            dateInput.onchange = updateExportKhamCauGiayWeekPreview;
            modal.classList.add('active');
        }
        function closeExportKhamCauGiayPDFModal() {
            const modal = document.getElementById('exportKhamCauGiayPDFModal');
            if (modal) modal.classList.remove('active');
        }
        function updateExportKhamCauGiayWeekPreview() {
            const dateInput = document.getElementById('exportKhamCauGiayDate');
            const preview = document.getElementById('exportKhamCauGiayWeekPreview');
            if (!dateInput || !preview || !dateInput.value) return;
            const d = new Date(dateInput.value + 'T12:00:00');
            const weekStart = getMondayOfWeek(d);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const fmt = (x) => x.getDate() + '/' + (x.getMonth() + 1) + '/' + x.getFullYear();
            preview.textContent = 'Tuần: ' + fmt(weekStart) + ' (T2) - ' + fmt(weekEnd) + ' (CN)';
        }
        function getMondayOfWeek(d) {
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const monday = new Date(d);
            monday.setDate(d.getDate() + diff);
            return monday;
        }
        function doExportKhamCauGiayPDF() {
            const dateInput = document.getElementById('exportKhamCauGiayDate');
            if (!dateInput || !dateInput.value) {
                alert('Vui lòng chọn ngày trong tuần.');
                return;
            }
            const d = new Date(dateInput.value + 'T12:00:00');
            const weekStart = getMondayOfWeek(d);
            closeExportKhamCauGiayPDFModal();
            exportKhamCauGiayToPDFByWeek(weekStart);
        }
        function exportKhamCauGiayToPDFByWeek(weekStart) {
            try {
                const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const rooms = khamcaugiayRooms || [];
                const roomHeaders = rooms.map(r => '<th style="padding:8px 6px;border:1px solid #555;text-align:center;font-size:10px;">' + ((r.name || r.id) + '').replace(/</g, '&lt;') + '</th>').join('');
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const allDates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    allDates.push(d);
                }
                let tableRows = '';
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const dayData = khamcaugiayData[key] || {};
                    const ldName = getLĐFromTructhuongtru(key);
                    const lichTrucDay = lichTrucData[key] || {};
                    const lichNghiText = (() => {
                        const parts = [];
                        ['ld','c1','c2','c3'].forEach(col => {
                            const cd = (quanlynghiphepData[key] || {})[col];
                            const fixedObj = new Date(key + 'T00:00:00');
                            const wd = fixedObj.getDay();
                            const wdKey = wd === 0 ? 7 : wd;
                            let doctors = [];
                            if (cd && Array.isArray(cd.doctors)) {
                                doctors = (cd.doctors || []).map(x => (x && x.key) ? getDoctorDisplayNameAnyColumn(x.key) : '').filter(Boolean);
                            } else if (wdKey >= 1 && wdKey <= 6) {
                                const fixed = getFixedScheduleForWeekday(col, wdKey);
                                doctors = fixed.map(f => getDoctorDisplayNameAnyColumn((f && f.key) || f)).filter(Boolean);
                            }
                            if (doctors.length) parts.push((col === 'ld' ? 'LĐ' : col.toUpperCase()) + ': ' + doctors.join(', '));
                        });
                        return parts.length ? parts.join(' | ') : '-';
                    })();
                    const lichTrucParts = [];
                    lichTrucParts.push('LĐ: ' + (ldName || '-'));
                    ['c1','c2','c3'].forEach(col => {
                        const cd = lichTrucDay[col] || {};
                        const dayName = cd.day ? (getDoctorDisplayNameAnyColumn(cd.day) || cd.day) : '';
                        const nightName = cd.night ? (getDoctorDisplayNameAnyColumn(cd.night) || cd.night) : '';
                        lichTrucParts.push('C' + col.slice(-1) + ': ' + (dayName || '-') + '/' + (nightName || '-'));
                    });
                    const wd = date.getDay();
                    if (wd === 6) {
                        const t1630 = lichTrucDay.truc1630 ? getDoctorDisplayNameAnyColumn(lichTrucDay.truc1630) : '';
                        lichTrucParts.push('16h30: ' + (t1630 || '-'));
                    }
                    const lichTrucText = lichTrucParts.join(' | ');
                    const roomCells = rooms.map(r => {
                        const slot = getKhamCauGiaySlotData(dayData, r.id, key);
                        const docName = slot.doctor ? (getDoctorDisplayNameAnyColumn(slot.doctor) || slot.doctor) : '-';
                        let badge = '';
                        if (r.khamTrua && slot.khamTrua) badge += ' Trưa';
                        if (r.kham20h && slot.kham20h) badge += ' 20h';
                        const cellText = (docName || '-') + (badge ? ' [' + badge.trim() + ']' : '');
                        return '<td style="padding:6px 4px;border:1px solid #ddd;font-size:10px;text-align:center;">' + cellText.replace(/</g, '&lt;') + '</td>';
                    }).join('');
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    const holidayLabel = isHoliday && typeof getHolidayDisplayLabel === 'function' ? (getHolidayDisplayLabel(key).label || 'Nghỉ lễ') : '';
                    const dateStr = date.getDate() + '/' + (date.getMonth() + 1);
                    const weekday = weekdayNames[date.getDay()];
                    const rowStyle = isHoliday ? 'background:#d32f2f;color:#fff;' : '';
                    const cellStyle = isHoliday ? 'padding:6px 4px;border:1px solid #b71c1c;font-weight:600;font-size:10px;color:#fff;' : 'padding:6px 4px;border:1px solid #ddd;font-weight:600;font-size:10px;';
                    const cellStyleNorm = isHoliday ? 'padding:6px 4px;border:1px solid #b71c1c;font-size:9px;color:#fff;' : 'padding:6px 4px;border:1px solid #ddd;font-size:9px;';
                    const nghiEsc = (lichNghiText || '-').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    const trucEsc = (lichTrucText || '-').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    tableRows += `<tr style="${rowStyle}"><td style="${cellStyle}">${dateStr}</td><td style="${cellStyleNorm}">${weekday}</td>${roomCells}<td style="${cellStyleNorm}">${nghiEsc}</td><td style="${cellStyleNorm}">${trucEsc}</td><td style="${cellStyleNorm}">${holidayLabel}</td></tr>`;
                });
                const fmt = (x) => x.getDate() + '/' + (x.getMonth() + 1) + '/' + x.getFullYear();
                const title = 'Lịch khám Cầu Giấy - Tuần ' + fmt(weekStart) + ' - ' + fmt(weekEnd);
                const html = `
                    <div style="font-family:Arial,sans-serif;padding:16px;background:#fff;">
                        <div style="margin-bottom:16px;border-bottom:2px solid #667eea;padding-bottom:8px;">
                            <h1 style="color:#2c5282;margin:0;font-size:18px;font-weight:700;">${title}</h1>
                            <p style="color:#718096;margin:6px 0 0 0;font-size:11px;">Cơ sở Cầu Giấy | Ngày xuất: ${new Date().toLocaleDateString('vi-VN', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                        </div>
                        <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
                            <thead>
                                <tr style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;">
                                    <th style="padding:8px 4px;border:1px solid #555;width:40px;">Ngày</th>
                                    <th style="padding:8px 4px;border:1px solid #555;width:32px;">Thứ</th>
                                    <th style="padding:8px 6px;border:1px solid #555;text-align:center;font-size:10px;">${roomHeaders}</th>
                                    <th style="padding:8px 6px;border:1px solid #555;font-size:9px;">Lịch nghỉ</th>
                                    <th style="padding:8px 6px;border:1px solid #555;font-size:9px;">Lịch trực</th>
                                    <th style="padding:8px 4px;border:1px solid #555;width:50px;font-size:9px;">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>`;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.width = '297mm';
                tempDiv.style.background = 'white';
                document.body.appendChild(tempDiv);
                const loadingMsg = document.createElement('div');
                loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:8px;z-index:10001;';
                loadingMsg.textContent = '📄 Đang tạo file PDF...';
                document.body.appendChild(loadingMsg);
                const opt = {
                    margin: [8, 8, 8, 8],
                    filename: `Lich_kham_Cau_Giay_${toLocalDateKey(weekStart)}_${toLocalDateKey(weekEnd)}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };
                html2pdf().set(opt).from(tempDiv.firstElementChild).save().then(() => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('✅ Đã xuất PDF lịch khám Cầu Giấy theo tuần thành công!');
                }).catch(err => {
                    document.body.removeChild(tempDiv);
                    if (loadingMsg.parentNode) document.body.removeChild(loadingMsg);
                    alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
                });
            } catch (err) {
                console.error('Lỗi exportKhamCauGiayToPDFByWeek:', err);
                alert('❌ Lỗi xuất PDF: ' + (err?.message || err));
            }
        }

        // ========== Lịch khám Long Biên (5 tháng) ==========
        function initKhamLongBienCalendar() {
            renderKhamLongBienCalendar();
        }
        // Helper: đảm bảo cấu trúc dữ liệu cho 1 ngày Long Biên. Chủ nhật không có khám sớm (early luôn rỗng).
        function getKhamLongBienDayData(dateStr) {
            let day = khamlongbienData[dateStr];
            if (!day || typeof day !== 'object') {
                day = {};
            }
            const d = new Date(dateStr + 'T00:00:00');
            const isSunday = d.getDay() === 0;
            if (isSunday) {
                day.early = { san: '', sieuam: '' };
            } else {
                if (!day.early) day.early = { san: '', sieuam: '' };
            }
            if (!day.rooms) day.rooms = {};
            if (!day.sundayDoctor) day.sundayDoctor = '';
            return day;
        }
        function renderKhamLongBienCalendar() {
            const container = document.getElementById('khamlongbienCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const numCycles = 5;
            const doctorOptions = getKhamCauGiayDoctorOptions();
            const hasEditPermission = hasPermission('khamlongbien') || currentUser?.role === 'admin';
            container.innerHTML = '';
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.className = 'calendar-month-card';
                monthEl.style.cssText = 'flex:0 1 100%;width:100%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;';
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                const title = document.createElement('div');
                title.style.cssText = 'text-align:center;font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = `Lịch khám Long Biên tháng ${monthNum}/${year}`;
                monthEl.appendChild(title);

                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:10px;';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.cssText = 'text-align:center;font-size:14px;color:#666;';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });

                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) grid.appendChild(document.createElement('div'));

                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const toLocalDateKey = (dd) => dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
                const todayKey = toLocalDateKey(today);

                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const isPastDate = key < todayKey;
                    const dayDataRaw = khamlongbienData[key] || {};
                    const dayData = getKhamLongBienDayData(key);
                    // Nghỉ phép theo buổi
                    const excludeMorningKeys = getDoctorsOnLeaveForDateAndPeriod(key, 'morning');
                    const excludeAfternoonKeys = getDoctorsOnLeaveForDateAndPeriod(key, 'afternoon');
                    // Bác sĩ đang khám Cầu Giấy cùng ngày thì không được khám Long Biên
                    const cauGiayBusyKeys = getKhamCauGiayDoctorsForDate ? getKhamCauGiayDoctorsForDate(key) : new Set();

                    // Lịch nghỉ / lịch trực giống lịch khám Cầu Giấy
                    const lichNghiText = (() => {
                        const parts = [];
                        ['ld','c1','c2','c3'].forEach(col => {
                            const cd = (quanlynghiphepData[key] || {})[col];
                            const fixedObj = new Date(key + 'T00:00:00');
                            const wd = fixedObj.getDay();
                            const wdKey = wd === 0 ? 7 : wd;
                            let doctors = [];
                            if (cd && Array.isArray(cd.doctors)) {
                                doctors = (cd.doctors || []).map(x => (x && x.key) ? getDoctorDisplayNameAnyColumn(x.key) : '').filter(Boolean);
                            } else if (wdKey >= 1 && wdKey <= 6) {
                                const fixed = getFixedScheduleForWeekday(col, wdKey);
                                doctors = fixed.map(f => getDoctorDisplayNameAnyColumn((f && f.key) || f)).filter(Boolean);
                            }
                            if (doctors.length) parts.push((col === 'ld' ? 'LĐ' : col.toUpperCase()) + ': ' + doctors.join(', '));
                        });
                        return parts.length ? parts.join(' | ') : '-';
                    })();
                    const lichTrucDay = lichTrucData[key] || {};
                    const ldName = getLĐFromTructhuongtru(key);
                    const lichTrucParts = [];
                    lichTrucParts.push('LĐ: ' + (ldName || '-'));
                    ['c1','c2','c3'].forEach(col => {
                        const cd = lichTrucDay[col] || {};
                        const dayName = cd.day ? (getDoctorDisplayNameAnyColumn(cd.day) || cd.day) : '';
                        const nightName = cd.night ? (getDoctorDisplayNameAnyColumn(cd.night) || cd.night) : '';
                        lichTrucParts.push('C' + col.slice(-1) + ': ' + (dayName || '-') + '/' + (nightName || '-'));
                    });
                    const wd = date.getDay();
                    if (wd === 6) {
                        const t1630 = lichTrucDay.truc1630 ? getDoctorDisplayNameAnyColumn(lichTrucDay.truc1630) : '';
                        lichTrucParts.push('16h30: ' + (t1630 || '-'));
                    }
                    const lichTrucText = lichTrucParts.join(' | ');

                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    dayCell.style.cssText = 'border:1px solid #e6e9ef;border-radius:6px;padding:6px 8px;background:#f8fafc;min-height:180px;display:flex;flex-direction:column;gap:4px;';
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    if (isHoliday) { dayCell.style.background = '#d32f2f'; dayCell.style.color = '#fff'; }
                    if (isPastDate) { dayCell.style.opacity = '0.35'; dayCell.style.background = '#e9ecef'; dayCell.style.pointerEvents = 'none'; }

                    const dayLabel = document.createElement('div');
                    dayLabel.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:4px;';
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayCell.appendChild(dayLabel);

                    if (isHoliday) {
                        const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(key) : { label: '' };
                        if (hl.label) {
                            const hb = document.createElement('div');
                            hb.textContent = '🏮 ' + hl.label;
                            hb.style.fontSize = '11px';
                            dayCell.appendChild(hb);
                        }
                    }

                    const isSunday = wd === 0;
                    // Dòng Khám sớm (1 BS sản + 1 BS siêu âm) — Chủ nhật không có khám sớm, chỉ hiển thị từ T2–T7
                    if (!isSunday) {
                        const earlyRow = document.createElement('div');
                        earlyRow.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap;margin-bottom:2px;';
                        const earlyLabel = document.createElement('span');
                        earlyLabel.textContent = 'Khám sớm:';
                        earlyLabel.style.minWidth = '70px';
                        earlyLabel.style.fontWeight = '600';
                        earlyRow.appendChild(earlyLabel);
                        const makeEarlySelect = (currentKey, placeholder, onChange) => {
                            const sel = document.createElement('select');
                            sel.style.cssText = 'flex:1;min-width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                            sel.disabled = isPastDate || !hasEditPermission;
                            sel.innerHTML = '<option value="">' + placeholder + '</option>' + doctorOptions.map(n => {
                                const k = normalizeKey(n);
                                if (excludeMorningKeys.has(k) || cauGiayBusyKeys.has(k)) return '';
                                return `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${(n || '').replace(/"/g, '&quot;')}</option>`;
                            }).filter(Boolean).join('');
                            sel.onchange = () => onChange(sel.value);
                            return sel;
                        };
                        const earlySanKey = (dayDataRaw.early && dayDataRaw.early.san) || dayData.early.san || '';
                        const earlySieuAmKey = (dayDataRaw.early && dayDataRaw.early.sieuam) || dayData.early.sieuam || '';
                        earlyRow.appendChild(makeEarlySelect(earlySanKey, 'BS sản', (val) => updateKhamLongBienEarly(key, 'san', val)));
                        earlyRow.appendChild(makeEarlySelect(earlySieuAmKey, 'BS siêu âm', (val) => updateKhamLongBienEarly(key, 'sieuam', val)));
                        dayCell.appendChild(earlyRow);
                    }
                    if (isSunday) {
                        // Chủ nhật: dùng phòng + dữ liệu từ tab Lịch khám chủ nhật (lamviechangngay)
                        const lvcnDay = lamviechangngayData[key] || {};
                        (lamviechangngayRoomsLongBien || []).forEach(room => {
                            const currentVal = (lvcnDay['longbien_' + room.id] || '').trim();
                            const row = document.createElement('div');
                            row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap;margin-bottom:4px;';
                            const lbl = document.createElement('span');
                            lbl.textContent = (room.name || room.id) + ':';
                            lbl.style.minWidth = '70px';
                            lbl.style.fontWeight = '600';
                            row.appendChild(lbl);
                            const sel = document.createElement('select');
                            sel.style.cssText = 'flex:1;min-width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                            sel.disabled = isPastDate || !hasEditPermission;
                            sel.innerHTML = '<option value="">--</option>' + doctorOptions.map(n => {
                                const k = normalizeKey(n);
                                if (excludeMorningKeys.has(k) || excludeAfternoonKeys.has(k) || cauGiayBusyKeys.has(k)) return '';
                                return `<option value="${k}" ${normalizeKey(currentVal) === k ? 'selected' : ''}>${(n || '').replace(/"/g, '&quot;')}</option>`;
                            }).filter(Boolean).join('');
                            sel.onchange = () => {
                                updateLamviechangngaySlotDoctor(key, 'longbien', room.id, sel.value);
                                renderKhamLongBienCalendar();
                            };
                            row.appendChild(sel);
                            dayCell.appendChild(row);
                        });
                    } else {
                        // Các ngày thường: 1 dòng tiêu đề (Phòng | Sáng | Chiều), mỗi phòng 1 dòng 3 ô — Tên phòng | Bác sĩ sáng | Bác sĩ chiều
                        const roomGridWrap = document.createElement('div');
                        roomGridWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
                        const headerRow = document.createElement('div');
                        headerRow.style.cssText = 'display:grid;grid-template-columns:minmax(52px,auto) 1fr 1fr;align-items:center;gap:6px;font-size:10px;color:#666;font-weight:700;padding-bottom:2px;border-bottom:1px solid #e0e0e0;';
                        headerRow.innerHTML = '<span>Phòng</span><span>Sáng</span><span>Chiều</span>';
                        roomGridWrap.appendChild(headerRow);
                        const makeRoomSelect = (currentKey, onChange, periodKey) => {
                            const sel = document.createElement('select');
                            sel.style.cssText = 'width:100%;min-width:0;padding:3px 4px;border:1px solid #ddd;border-radius:4px;font-size:10px;';
                            sel.disabled = isPastDate || !hasEditPermission;
                            sel.innerHTML = '<option value="">--</option>' + doctorOptions.map(n => {
                                const k = normalizeKey(n);
                                const leaveSet = periodKey === 'morning' ? excludeMorningKeys : excludeAfternoonKeys;
                                if (leaveSet.has(k) || cauGiayBusyKeys.has(k)) return '';
                                return `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${(n || '').replace(/"/g, '&quot;')}</option>`;
                            }).filter(Boolean).join('');
                            sel.onchange = () => onChange(sel.value);
                            return sel;
                        };
                        (khamlongbienRooms || []).forEach(room => {
                            const roomsData = (dayDataRaw.rooms && dayDataRaw.rooms[room.id]) || (dayData.rooms && dayData.rooms[room.id]) || {};
                            const slotMorning = roomsData.morning || '';
                            const slotAfternoon = roomsData.afternoon || '';
                            const row = document.createElement('div');
                            row.style.cssText = 'display:grid;grid-template-columns:minmax(52px,auto) 1fr 1fr;align-items:center;gap:6px;font-size:10px;';
                            const lbl = document.createElement('span');
                            lbl.textContent = (room.name || room.id);
                            lbl.style.fontWeight = '600';
                            lbl.style.overflow = 'hidden';
                            lbl.style.textOverflow = 'ellipsis';
                            row.appendChild(lbl);
                            row.appendChild(makeRoomSelect(slotMorning, (val) => updateKhamLongBienRoomSlot(key, room.id, 'morning', val), 'morning'));
                            row.appendChild(makeRoomSelect(slotAfternoon, (val) => updateKhamLongBienRoomSlot(key, room.id, 'afternoon', val), 'afternoon'));
                            roomGridWrap.appendChild(row);
                        });
                        dayCell.appendChild(roomGridWrap);
                    }

                    const nghiRow = document.createElement('div');
                    nghiRow.style.cssText = 'font-size:10px;color:#666;margin-top:4px;padding-top:4px;border-top:1px dashed #ddd;';
                    nghiRow.innerHTML = '<strong>Lịch nghỉ:</strong> ' + lichNghiText;
                    dayCell.appendChild(nghiRow);
                    const trucRow = document.createElement('div');
                    trucRow.style.cssText = 'font-size:10px;color:#666;';
                    trucRow.innerHTML = '<strong>Lịch trực:</strong> ' + lichTrucText;
                    dayCell.appendChild(trucRow);

                    grid.appendChild(dayCell);
                });

                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        function updateKhamLongBienEarly(dateStr, field, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamlongbien') && currentUser?.role !== 'admin') return;
            const d = new Date(dateStr + 'T00:00:00');
            if (d.getDay() === 0) return; // Chủ nhật không có khám sớm, không lưu
            const day = getKhamLongBienDayData(dateStr);
            if (!day.early) day.early = { san: '', sieuam: '' };
            day.early[field] = doctorKey || '';
            // Chỉ lưu nếu có dữ liệu thực sự
            if (day.early.san || day.early.sieuam || day.sundayDoctor || (day.rooms && Object.keys(day.rooms).length)) {
                khamlongbienData[dateStr] = day;
            } else {
                delete khamlongbienData[dateStr];
            }
            saveKhamLongBienData();
        }
        function updateKhamLongBienSundayDoctor(dateStr, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamlongbien') && currentUser?.role !== 'admin') return;
            const day = getKhamLongBienDayData(dateStr);
            day.sundayDoctor = doctorKey || '';
            if (day.early.san || day.early.sieuam || day.sundayDoctor || (day.rooms && Object.keys(day.rooms).length)) {
                khamlongbienData[dateStr] = day;
            } else {
                delete khamlongbienData[dateStr];
            }
            saveKhamLongBienData();
        }
        function updateKhamLongBienRoomSlot(dateStr, roomId, shift, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamlongbien') && currentUser?.role !== 'admin') return;
            const day = getKhamLongBienDayData(dateStr);
            if (!day.rooms) day.rooms = {};
            if (!day.rooms[roomId]) day.rooms[roomId] = { morning: '', afternoon: '' };
            day.rooms[roomId][shift] = doctorKey || '';
            // Nếu phòng không còn dữ liệu thì xóa
            if (!day.rooms[roomId].morning && !day.rooms[roomId].afternoon) {
                delete day.rooms[roomId];
            }
            if (day.early.san || day.early.sieuam || day.sundayDoctor || (day.rooms && Object.keys(day.rooms).length)) {
                khamlongbienData[dateStr] = day;
            } else {
                delete khamlongbienData[dateStr];
            }
            saveKhamLongBienData();
        }
        function saveKhamLongBienData() {
            StorageUtil.saveJson(STORAGE_KEYS.khamlongbienData, khamlongbienData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // Lấy danh sách bác sĩ đang khám Cầu Giấy (lịch chính ban ngày) trong 1 ngày – để tránh trùng với Long Biên
        function getKhamCauGiayDoctorsForDate(dateStr) {
            const keys = new Set();
            const d = new Date(dateStr + 'T00:00:00');
            if (d.getDay() === 0) {
                const lvcn = lamviechangngayData[dateStr] || {};
                (lamviechangngayRoomsCauGiay || []).forEach(r => {
                    const v = (lvcn['caugiay_' + r.id] || '').trim();
                    if (v) keys.add(normalizeKey(v));
                });
                return keys;
            }
            const dayData = khamcaugiayData[dateStr];
            if (!dayData || typeof dayData !== 'object') return keys;
            const rooms = khamcaugiayRooms || [];
            rooms.forEach(r => {
                const slot = getKhamCauGiaySlotData(dayData, r.id);
                if (slot && slot.doctor) keys.add(slot.doctor);
            });
            return keys;
        }

        // Helper: render 1 chu kỳ tháng cho lịch 1 bác sĩ/ngày (dùng cho khamcaugiay, khamlongbien)
        function renderSingleDoctorMonthCycle(cycleStart, cycleEnd, dataObj, permissionKey, updateFn, saveFn) {
            const month = document.createElement('div');
            month.style.cssText = 'flex: 0 1 100%; width: 100%; min-width: 100%; max-width: 100%; background: #fff; border-radius: 10px; padding: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);';
            const title = document.createElement('div');
            title.style.cssText = 'text-align: center; font-weight: 700; margin-bottom: 8px;';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            title.textContent = `Tháng ${monthNum}/${year} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
            month.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(7,1fr); gap: 8px;';
            ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.cssText = 'text-align: center; font-size: 14px; color: #666;';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            for (let i = 0; i < startOffset; i++) grid.appendChild(document.createElement('div'));
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const todayForCompare = new Date();
            todayForCompare.setHours(0, 0, 0, 0);
            allDates.forEach(date => {
                const dateStr = formatDateForStorage(date);
                const isPast = date < todayForCompare;
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && date.getMonth() === todayForCompare.getMonth() && date.getDate() === todayForCompare.getDate();
                const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                const doctorName = (dataObj[dateStr] || '').replace(/"/g, '&quot;');
                const hasEditPermission = hasPermission(permissionKey);
                const shouldDisable = isPast || !hasEditPermission;
                const disabledAttr = shouldDisable ? 'disabled' : '';
                const disabledStyle = shouldDisable ? 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;' : '';
                const dayCell = document.createElement('div');
                dayCell.style.cssText = `border: ${isToday ? '3px solid #ffc107' : '1px solid #e6e9ef'}; border-radius: 6px; padding: 8px; background: ${isHoliday ? '#d32f2f' : (isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#f8fafc'))}; min-height: 80px; display: flex; flex-direction: column; gap: 4px;`;
                if (isHoliday) dayCell.style.color = '#fff';
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.cssText = 'font-size: 12px; font-weight: 600;';
                dayCell.appendChild(dayLabel);
                if (isHoliday) {
                    const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.cssText = 'font-size: 11px; margin-bottom: 4px; font-weight: 500;';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.value = dataObj[dateStr] || '';
                input.placeholder = 'Bác sĩ';
                input.setAttribute('data-date', dateStr);
                if (shouldDisable) input.disabled = true;
                input.style.cssText = 'padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                input.onchange = function() { window[updateFn](dateStr, this.value); };
                dayCell.appendChild(input);
                grid.appendChild(dayCell);
            });
            month.appendChild(grid);
            return month;
        }

        // ========== Lịch khám Cầu Giấy buổi trưa +20h (5 tháng, 2 dòng: trưa + 20h, đồng bộ với lịch khám Cầu Giấy) ==========
        function getTruaDoctorFromKhamCauGiay(dateStr) {
            const dayData = khamcaugiayData[dateStr];
            if (!dayData || typeof dayData !== 'object') return '';
            const rooms = khamcaugiayRooms || [];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                if (!r.khamTrua) continue;
                const slot = getKhamCauGiaySlotData(dayData, r.id);
                if (slot.khamTrua && slot.doctor) return slot.doctor;
            }
            return '';
        }
        function get20hDoctorFromKhamCauGiay(dateStr) {
            const dayData = khamcaugiayData[dateStr];
            if (!dayData || typeof dayData !== 'object') return '';
            const rooms = khamcaugiayRooms || [];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                if (!r.kham20h) continue;
                const slot = getKhamCauGiaySlotData(dayData, r.id);
                if (slot.kham20h && slot.doctor) return slot.doctor;
            }
            return '';
        }
        function getResolvedTrua20h(dateStr) {
            const fromMain = getTruaDoctorFromKhamCauGiay(dateStr);
            const from20h = (khamcaugiay20hData[dateStr] && typeof khamcaugiay20hData[dateStr] === 'object') ? (khamcaugiay20hData[dateStr].trua || '') : '';
            const fromMain20h = get20hDoctorFromKhamCauGiay(dateStr);
            const from20hBuoi = (khamcaugiay20hData[dateStr] && typeof khamcaugiay20hData[dateStr] === 'object') ? (khamcaugiay20hData[dateStr].buoi20h || '') : '';
            return { trua: (fromMain || from20h || '').trim(), buoi20h: (fromMain20h || from20hBuoi || '').trim() };
        }
        function syncKhamCauGiay20hToMain(dateStr, truaKey, buoi20hKey) {
            if (!khamcaugiayData[dateStr]) khamcaugiayData[dateStr] = {};
            const rooms = khamcaugiayRooms || [];
            let firstTruaRoom = null, first20hRoom = null;
            rooms.forEach(r => {
                if (r.khamTrua && !firstTruaRoom) firstTruaRoom = r;
                if (r.kham20h && !first20hRoom) first20hRoom = r;
            });
            if (firstTruaRoom) {
                const slot = getKhamCauGiaySlotData(khamcaugiayData[dateStr], firstTruaRoom.id);
                const isSameRoom = first20hRoom && first20hRoom.id === firstTruaRoom.id;
                const doc = truaKey || (isSameRoom ? buoi20hKey : '') || slot.doctor;
                const kt = !!truaKey;
                const k20 = isSameRoom ? !!buoi20hKey : !!slot.kham20h;
                if (doc || k20) khamcaugiayData[dateStr][firstTruaRoom.id] = { doctor: doc, khamTrua: kt, kham20h: k20 };
                else delete khamcaugiayData[dateStr][firstTruaRoom.id];
            }
            if (first20hRoom && first20hRoom.id !== (firstTruaRoom && firstTruaRoom.id)) {
                const slot = getKhamCauGiaySlotData(khamcaugiayData[dateStr], first20hRoom.id);
                const doc = buoi20hKey || slot.doctor;
                const kt = !!slot.khamTrua;
                const k20 = !!buoi20hKey;
                if (doc || kt) khamcaugiayData[dateStr][first20hRoom.id] = { doctor: doc, khamTrua: kt, kham20h: k20 };
                else delete khamcaugiayData[dateStr][first20hRoom.id];
            }
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            renderKhamCauGiayCalendar();
        }
        function initKhamCauGiay20hCalendar() {
            renderKhamCauGiay20hCalendar();
        }
        function renderKhamCauGiay20hCalendar() {
            const container = document.getElementById('khamcaugiay20hCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const doctorOptions = getKhamCauGiayDoctorOptions();
            const hasEditPermission = hasPermission('khamcaugiay20h') || currentUser?.role === 'admin';
            container.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.className = 'calendar-month-card';
                monthEl.style.cssText = 'flex:0 1 100%;width:100%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;';
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                const title = document.createElement('div');
                title.style.cssText = 'text-align:center;font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = `Lịch khám Cầu Giấy buổi trưa +20h tháng ${monthNum}/${year}`;
                monthEl.appendChild(title);
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:10px;';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.cssText = 'text-align:center;font-size:14px;color:#666;';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });
                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) grid.appendChild(document.createElement('div'));
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const todayKey = toLocalDateKey(today);
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const resolved = getResolvedTrua20h(key);
                    const excludeKeys = getDoctorsOnLeaveForDate(key);
                    const isPast = key < todayKey;
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    dayCell.style.cssText = 'border:1px solid #e6e9ef;border-radius:6px;padding:8px;background:#f8fafc;min-height:120px;display:flex;flex-direction:column;gap:6px;';
                    if (isHoliday) { dayCell.style.background = '#d32f2f'; dayCell.style.color = '#fff'; }
                    if (isPast) { dayCell.style.opacity = '0.35'; dayCell.style.background = '#e9ecef'; }
                    const dayLabel = document.createElement('div');
                    dayLabel.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:2px;';
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayCell.appendChild(dayLabel);
                    if (isHoliday) {
                        const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(key) : { label: '' };
                        if (hl.label) { const hb = document.createElement('div'); hb.textContent = '🏮 ' + hl.label; hb.style.fontSize = '11px'; dayCell.appendChild(hb); }
                    }
                    const rowTrua = document.createElement('div');
                    rowTrua.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;';
                    const lblTrua = document.createElement('span');
                    lblTrua.textContent = 'Bác sĩ khám trưa:';
                    lblTrua.style.minWidth = '110px';
                    lblTrua.style.fontWeight = '600';
                    rowTrua.appendChild(lblTrua);
                    const selTrua = document.createElement('select');
                    selTrua.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                    selTrua.disabled = isPast || !hasEditPermission;
                    selTrua.innerHTML = '<option value="">--</option>' + (doctorOptions || []).map(n => {
                        const k = normalizeKey(n);
                        if (excludeKeys.has(k)) return '';
                        return '<option value="' + k + '"' + (k === resolved.trua ? ' selected' : '') + '>' + (n || '').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
                    }).filter(Boolean).join('');
                    selTrua.onchange = () => updateKhamCauGiay20hSlot(key, 'trua', selTrua.value);
                    rowTrua.appendChild(selTrua);
                    dayCell.appendChild(rowTrua);
                    const row20h = document.createElement('div');
                    row20h.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;';
                    const lbl20h = document.createElement('span');
                    lbl20h.textContent = 'Bác sĩ khám 20h:';
                    lbl20h.style.minWidth = '110px';
                    lbl20h.style.fontWeight = '600';
                    row20h.appendChild(lbl20h);
                    const sel20h = document.createElement('select');
                    sel20h.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                    sel20h.disabled = isPast || !hasEditPermission;
                    sel20h.innerHTML = '<option value="">--</option>' + (doctorOptions || []).map(n => {
                        const k = normalizeKey(n);
                        if (excludeKeys.has(k)) return '';
                        return '<option value="' + k + '"' + (k === resolved.buoi20h ? ' selected' : '') + '>' + (n || '').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
                    }).filter(Boolean).join('');
                    sel20h.onchange = () => updateKhamCauGiay20hSlot(key, 'buoi20h', sel20h.value);
                    row20h.appendChild(sel20h);
                    dayCell.appendChild(row20h);
                    grid.appendChild(dayCell);
                });
                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        function updateKhamCauGiay20hSlot(dateStr, slotType, doctorKey) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamcaugiay20h') && currentUser?.role !== 'admin') return;
            if (!khamcaugiay20hData[dateStr]) khamcaugiay20hData[dateStr] = { trua: '', buoi20h: '' };
            const entry = khamcaugiay20hData[dateStr];
            if (typeof entry !== 'object') khamcaugiay20hData[dateStr] = { trua: '', buoi20h: '' };
            if (slotType === 'trua') khamcaugiay20hData[dateStr].trua = (doctorKey || '').trim();
            if (slotType === 'buoi20h') khamcaugiay20hData[dateStr].buoi20h = (doctorKey || '').trim();
            const t = khamcaugiay20hData[dateStr].trua || '';
            const b = khamcaugiay20hData[dateStr].buoi20h || '';
            if (!t && !b) delete khamcaugiay20hData[dateStr];
            saveKhamCauGiay20hData();
            syncKhamCauGiay20hToMain(dateStr, t, b);
        }
        function saveKhamCauGiay20hData() {
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiay20hData, khamcaugiay20hData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            renderKhamCauGiay20hCalendar();
        }

        // ========== Lịch khám sớm + khám trưa Long Biên (gộp Lịch khám sớm + Lịch trực trưa, hiển thị giống Cầu Giấy trưa+20h) ==========
        function initKhamSomTruaLBCalendar() {
            renderKhamSomTruaLBCalendar();
        }
        function renderKhamSomTruaLBCalendar() {
            const container = document.getElementById('khamsomTruaLBCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            const toLocalDateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const doctorOptions = getKhamCauGiayDoctorOptions();
            const hasEditPermission = hasPermission('khamsom') || hasPermission('tructrua') || hasPermission('khamsomTruaLB') || currentUser?.role === 'admin';
            container.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = document.createElement('div');
                monthEl.className = 'calendar-month-card';
                monthEl.style.cssText = 'flex:0 1 100%;width:100%;background:#fff;border-radius:12px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;';
                const monthNum = cycleEnd.getMonth() + 1;
                const year = cycleEnd.getFullYear();
                const title = document.createElement('div');
                title.style.cssText = 'text-align:center;font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = `Lịch khám sớm + khám trưa Long Biên tháng ${monthNum}/${year}`;
                monthEl.appendChild(title);
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:10px;';
                ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                    const wEl = document.createElement('div');
                    wEl.style.cssText = 'text-align:center;font-size:14px;color:#666;';
                    wEl.textContent = w;
                    grid.appendChild(wEl);
                });
                const firstWeekday = cycleStart.getDay();
                const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
                for (let j = 0; j < startOffset; j++) grid.appendChild(document.createElement('div'));
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const todayKey = toLocalDateKey(today);
                allDates.forEach(date => {
                    const key = toLocalDateKey(date);
                    const khamSomVal = (khamsomData[key] || '').trim();
                    const khamTruaVal = (tructruaData[key] || '').trim();
                    const excludeKeys = getDoctorsOnLeaveForDate(key);
                    const isPast = key < todayKey;
                    const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(key);
                    // Chỉ khóa chỉnh sửa khi ngày đã qua; ngày lễ vẫn được phép sửa
                    const canEdit = !isPast && hasEditPermission;
                    const dayCell = document.createElement('div');
                    dayCell.className = 'nghiphep-day-cell';
                    dayCell.style.cssText = 'border:1px solid #e6e9ef;border-radius:6px;padding:8px;background:#f8fafc;min-height:120px;display:flex;flex-direction:column;gap:6px;';
                    if (isHoliday) { dayCell.style.background = '#d32f2f'; dayCell.style.color = '#fff'; }
                    if (isPast) { dayCell.style.opacity = '0.35'; dayCell.style.background = '#e9ecef'; }
                    const dayLabel = document.createElement('div');
                    dayLabel.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:2px;';
                    dayLabel.textContent = formatDateWithWeekday(date);
                    dayCell.appendChild(dayLabel);
                    if (isHoliday) {
                        const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(key) : { label: '' };
                        if (hl.label) { const hb = document.createElement('div'); hb.textContent = '🏮 ' + hl.label; hb.style.fontSize = '11px'; dayCell.appendChild(hb); }
                    }
                    const rowSom = document.createElement('div');
                    rowSom.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;';
                    const lblSom = document.createElement('span');
                    lblSom.textContent = 'Bác sĩ khám sớm:';
                    lblSom.style.minWidth = '120px';
                    lblSom.style.fontWeight = '600';
                    rowSom.appendChild(lblSom);
                    const selSom = document.createElement('select');
                    selSom.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                    selSom.disabled = !canEdit;
                    selSom.innerHTML = '<option value="">--</option>' + (doctorOptions || []).map(n => {
                        const displayName = (n || '').trim();
                        if (!displayName) return '';
                        if (excludeKeys.has(normalizeKey(displayName))) return '';
                        const selected = (normalizeKey(khamSomVal) === normalizeKey(displayName)) ? ' selected' : '';
                        return '<option value="' + (displayName || '').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"' + selected + '>' + (displayName || '').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
                    }).filter(Boolean).join('');
                    selSom.onchange = () => updateKhamSomTruaLBSlot(key, 'khamSom', selSom.value);
                    rowSom.appendChild(selSom);
                    dayCell.appendChild(rowSom);
                    const rowTrua = document.createElement('div');
                    rowTrua.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;';
                    const lblTrua = document.createElement('span');
                    lblTrua.textContent = 'Bác sĩ khám trưa:';
                    lblTrua.style.minWidth = '120px';
                    lblTrua.style.fontWeight = '600';
                    rowTrua.appendChild(lblTrua);
                    const selTrua = document.createElement('select');
                    selTrua.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;';
                    selTrua.disabled = !canEdit;
                    selTrua.innerHTML = '<option value="">--</option>' + (doctorOptions || []).map(n => {
                        const displayName = (n || '').trim();
                        if (!displayName) return '';
                        if (excludeKeys.has(normalizeKey(displayName))) return '';
                        const selected = (normalizeKey(khamTruaVal) === normalizeKey(displayName)) ? ' selected' : '';
                        return '<option value="' + (displayName || '').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"' + selected + '>' + (displayName || '').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
                    }).filter(Boolean).join('');
                    selTrua.onchange = () => updateKhamSomTruaLBSlot(key, 'khamTrua', selTrua.value);
                    rowTrua.appendChild(selTrua);
                    dayCell.appendChild(rowTrua);
                    grid.appendChild(dayCell);
                });
                monthEl.appendChild(grid);
                container.appendChild(monthEl);
            }
        }
        function updateKhamSomTruaLBSlot(dateStr, slotType, displayName) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamsom') && !hasPermission('tructrua') && !hasPermission('khamsomTruaLB') && currentUser?.role !== 'admin') return;
            const val = (displayName || '').trim();
            if (slotType === 'khamSom') {
                if (val) khamsomData[dateStr] = val; else delete khamsomData[dateStr];
                StorageUtil.saveJson(STORAGE_KEYS.khamsomData, khamsomData);
            } else {
                if (val) tructruaData[dateStr] = val; else delete tructruaData[dateStr];
                StorageUtil.saveJson(STORAGE_KEYS.tructruaData, tructruaData);
            }
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            renderKhamSomTruaLBCalendar();
        }

        // ========== Lịch khám sản VIP (sáng/chiều) ==========
        function initKhamSanVipCalendar() {
            renderVipMorningAfternoonCalendar('khamsanvip', khamsanvipData, 'khamsanvipCalendarContainer', 'updateKhamSanVipDate', 'saveKhamSanVipData', 'khamsanvip');
        }
        function renderKhamSanVipCalendar() {
            renderVipMorningAfternoonCalendar('khamsanvip', khamsanvipData, 'khamsanvipCalendarContainer', 'updateKhamSanVipDate', 'saveKhamSanVipData', 'khamsanvip');
        }
        function updateKhamSanVipDate(dateStr, shift, value) {
            updateVipMorningAfternoonDate(dateStr, shift, value, khamsanvipData, 'saveKhamSanVipData', 'khamsanvip');
        }
        function saveKhamSanVipData() {
            localStorage.setItem('khamsanvipData', JSON.stringify(khamsanvipData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch siêu âm VIP (sáng/chiều) ==========
        function initSieuAmVipCalendar() {
            renderVipMorningAfternoonCalendar('sieuamvip', sieuamvipData, 'sieuamvipCalendarContainer', 'updateSieuAmVipDate', 'saveSieuAmVipData', 'sieuamvip');
        }
        function renderSieuAmVipCalendar() {
            renderVipMorningAfternoonCalendar('sieuamvip', sieuamvipData, 'sieuamvipCalendarContainer', 'updateSieuAmVipDate', 'saveSieuAmVipData', 'sieuamvip');
        }
        function updateSieuAmVipDate(dateStr, shift, value) {
            updateVipMorningAfternoonDate(dateStr, shift, value, sieuamvipData, 'saveSieuAmVipData', 'sieuamvip');
        }
        function saveSieuAmVipData() {
            localStorage.setItem('sieuamvipData', JSON.stringify(sieuamvipData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch khám Sản + Siêu âm VIP (gộp 2 tab: 4 dòng Khám VIP sáng/chiều, Siêu âm VIP sáng/chiều) ==========
        const KHAMSAN_SIEUAM_VIP_ROWS = [
            { label: 'Khám VIP sáng', slot: 'khamVipSang', getData: (d) => (khamsanvipData[d] || {}).morning || '', setData: (d, v) => { if (!khamsanvipData[d]) khamsanvipData[d] = {}; khamsanvipData[d].morning = v; } },
            { label: 'Khám VIP chiều', slot: 'khamVipChieu', getData: (d) => (khamsanvipData[d] || {}).afternoon || '', setData: (d, v) => { if (!khamsanvipData[d]) khamsanvipData[d] = {}; khamsanvipData[d].afternoon = v; } },
            { label: 'Siêu âm VIP sáng', slot: 'sieuAmSang', getData: (d) => (sieuamvipData[d] || {}).morning || '', setData: (d, v) => { if (!sieuamvipData[d]) sieuamvipData[d] = {}; sieuamvipData[d].morning = v; } },
            { label: 'Siêu âm VIP chiều', slot: 'sieuAmChieu', getData: (d) => (sieuamvipData[d] || {}).afternoon || '', setData: (d, v) => { if (!sieuamvipData[d]) sieuamvipData[d] = {}; sieuamvipData[d].afternoon = v; } }
        ];
        function initKhamSanSieuamVipCalendar() {
            renderKhamSanSieuamVipCalendar();
        }
        function renderKhamSanSieuamVipCalendar() {
            const container = document.getElementById('khamsanSieuamVipContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            const toKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const doctorOptions = getKhamCauGiayDoctorOptions();
            const hasEdit = hasPermission('khamsanvip') || hasPermission('sieuamvip') || hasPermission('khamsanSieuamVip') || currentUser?.role === 'admin';
            container.innerHTML = '';
            for (let m = 0; m < 5; m++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + m, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthDiv = document.createElement('div');
                monthDiv.style.cssText = 'margin-bottom:24px;background:#fff;border-radius:12px;padding:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #e8ecf0;overflow-x:auto;';
                const title = document.createElement('div');
                title.style.cssText = 'font-weight:700;font-size:16px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #667eea;';
                title.textContent = 'Lịch khám Sản + Siêu âm VIP tháng ' + (cycleEnd.getMonth() + 1) + '/' + cycleEnd.getFullYear() + ' (25/' + (cycleStart.getMonth() + 1) + ' - 24/' + (cycleEnd.getMonth() + 1) + ')';
                monthDiv.appendChild(title);
                const allDates = [];
                let d = new Date(cycleStart);
                while (d <= cycleEnd) { allDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
                const todayKey = toKey(today);
                const table = document.createElement('table');
                table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
                const thead = document.createElement('thead');
                let headerRow = '<tr><th style="padding:10px;border:1px solid #ddd;background:#667eea;color:#fff;min-width:140px;text-align:left;">Lịch khám</th>';
                allDates.forEach(date => {
                    const key = toKey(date);
                    const isPast = key < todayKey;
                    headerRow += '<th style="padding:8px;border:1px solid #ddd;background:#' + (isPast ? '95a5a6' : '667eea') + ';color:#fff;min-width:100px;text-align:center;font-size:11px;">' + formatDateWithWeekday(date) + '</th>';
                });
                headerRow += '</tr>';
                thead.innerHTML = headerRow;
                table.appendChild(thead);
                const tbody = document.createElement('tbody');
                KHAMSAN_SIEUAM_VIP_ROWS.forEach(rowDef => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td style="padding:10px;border:1px solid #ddd;background:#f0f0f0;font-weight:600;">' + rowDef.label + '</td>';
                    allDates.forEach(date => {
                        const dateStr = toKey(date);
                        const isPast = dateStr < todayKey;
                        const leaveKeys = getDoctorsOnLeaveForDate(dateStr);
                        const currentVal = rowDef.getData(dateStr).trim();
                        const td = document.createElement('td');
                        td.style.cssText = 'padding:6px;border:1px solid #ddd;vertical-align:middle;';
                        const sel = document.createElement('select');
                        sel.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;';
                        sel.disabled = isPast || !hasEdit;
                        sel.innerHTML = '<option value="">--</option>' + (doctorOptions || []).map(n => {
                            const name = (n || '').trim();
                            if (!name) return '';
                            if (leaveKeys.has(normalizeKey(name))) return '';
                            const selected = (normalizeKey(currentVal) === normalizeKey(name)) ? ' selected' : '';
                            return '<option value="' + (name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"' + selected + '>' + (name || '').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
                        }).filter(Boolean).join('');
                        sel.onchange = function() { updateKhamSanSieuamVipSlot(dateStr, rowDef, this.value.trim()); };
                        td.appendChild(sel);
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                monthDiv.appendChild(table);
                container.appendChild(monthDiv);
            }
        }
        function updateKhamSanSieuamVipSlot(dateStr, rowDef, value) {
            const today = new Date();
            const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateStr < todayKey) return;
            if (!hasPermission('khamsanvip') && !hasPermission('sieuamvip') && !hasPermission('khamsanSieuamVip') && currentUser?.role !== 'admin') return;
            rowDef.setData(dateStr, value || '');
            if (rowDef.slot.indexOf('khamVip') === 0) {
                if (!khamsanvipData[dateStr].morning && !khamsanvipData[dateStr].afternoon) delete khamsanvipData[dateStr];
                StorageUtil.saveJson(STORAGE_KEYS.khamsanvipData, khamsanvipData);
            } else {
                if (!sieuamvipData[dateStr].morning && !sieuamvipData[dateStr].afternoon) delete sieuamvipData[dateStr];
                StorageUtil.saveJson(STORAGE_KEYS.sieuamvipData, sieuamvipData);
            }
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            renderKhamSanSieuamVipCalendar();
        }

        // Render calendar với 2 cộtsáng/chiều mỗi ngày - 5 tháng (chu kỳ 25-24) - dùng chung cho khamsanvip & sieuamvip
        function renderVipMorningAfternoonCalendar(tableId, dataObj, containerId, updateFn, saveFn, permissionKey) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const numCycles = 5;
            container.innerHTML = '';
            container.style.display = 'flex';
            container.style.gap = '20px';
            container.style.flexWrap = 'wrap';
            container.style.maxWidth = '100%';
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderVipMonthCycle(tableId, dataObj, cycleStart, cycleEnd, updateFn, permissionKey);
                container.appendChild(monthEl);
            }
        }
        function renderVipMonthCycle(tableId, dataObj, cycleStart, cycleEnd, updateFn, permissionKey) {
            const month = document.createElement('div');
            month.style.cssText = 'flex: 0 1 100%; width: 100%; min-width: 100%; max-width: 100%; background: #fff; border-radius: 10px; padding: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);';
            const title = document.createElement('div');
            title.style.cssText = 'text-align: center; font-weight: 700; margin-bottom: 8px;';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            title.textContent = `Tháng ${monthNum}/${year} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
            month.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(7,1fr); gap: 8px;';
            ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.cssText = 'text-align: center; font-size: 14px; color: #666;';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            for (let i = 0; i < startOffset; i++) grid.appendChild(document.createElement('div'));
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const todayForCompare = new Date();
            todayForCompare.setHours(0, 0, 0, 0);
            allDates.forEach(date => {
                        const dateStr = formatDateForStorage(date);
                const isPast = date < todayForCompare;
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && date.getMonth() === todayForCompare.getMonth() && date.getDate() === todayForCompare.getDate();
                const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                        const row = dataObj[dateStr] || {};
                        const morningVal = (row.morning || '').replace(/"/g, '&quot;');
                        const afternoonVal = (row.afternoon || '').replace(/"/g, '&quot;');
                        const hasEditPermission = hasPermission(permissionKey);
                        const shouldDisable = isPast || !hasEditPermission;
                        const disabledAttr = shouldDisable ? 'disabled' : '';
                        const disabledStyle = shouldDisable ? 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;' : '';
                const dayCell = document.createElement('div');
                dayCell.style.cssText = `border: ${isToday ? '3px solid #ffc107' : '1px solid #e6e9ef'}; border-radius: 6px; padding: 8px; background: ${isHoliday ? '#d32f2f' : (isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#f8fafc'))}; min-height: 100px; display: flex; flex-direction: column; gap: 4px;`;
                if (isHoliday) dayCell.style.color = '#fff';
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.cssText = 'font-size: 12px; font-weight: 600;';
                dayCell.appendChild(dayLabel);
                if (isHoliday) {
                    const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.cssText = 'font-size: 11px; margin-bottom: 4px; font-weight: 500;';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                const morningDiv = document.createElement('div');
                morningDiv.innerHTML = '<span style="font-size: 11px; color: #666;">Sáng</span>';
                const morningInput = document.createElement('input');
                morningInput.type = 'text';
                morningInput.value = row.morning || '';
                morningInput.placeholder = 'Bác sĩ sáng';
                morningInput.setAttribute('data-date', dateStr);
                morningInput.setAttribute('data-shift', 'morning');
                if (shouldDisable) morningInput.disabled = true;
                morningInput.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                morningInput.onchange = function() { window[updateFn](dateStr, 'morning', this.value); };
                morningDiv.appendChild(morningInput);
                dayCell.appendChild(morningDiv);
                const afternoonDiv = document.createElement('div');
                afternoonDiv.innerHTML = '<span style="font-size: 11px; color: #666;">Chiều</span>';
                const afternoonInput = document.createElement('input');
                afternoonInput.type = 'text';
                afternoonInput.value = row.afternoon || '';
                afternoonInput.placeholder = 'Bác sĩ chiều';
                afternoonInput.setAttribute('data-date', dateStr);
                afternoonInput.setAttribute('data-shift', 'afternoon');
                if (shouldDisable) afternoonInput.disabled = true;
                afternoonInput.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                afternoonInput.onchange = function() { window[updateFn](dateStr, 'afternoon', this.value); };
                afternoonDiv.appendChild(afternoonInput);
                dayCell.appendChild(afternoonDiv);
                grid.appendChild(dayCell);
            });
            month.appendChild(grid);
            return month;
        }

        function updateVipMorningAfternoonDate(dateStr, shift, value, dataObj, saveFn, permissionKey) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateObj = new Date(dateStr + 'T00:00:00');
            if (dateObj < today) {
                alert('Không thể chỉnh sửa ngày đã qua.');
                return;
            }
            if (!hasPermission(permissionKey)) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (!dataObj[dateStr]) dataObj[dateStr] = { morning: '', afternoon: '' };
            dataObj[dateStr][shift] = (value && value.trim()) ? value.trim() : '';
            if (!dataObj[dateStr].morning && !dataObj[dateStr].afternoon) delete dataObj[dateStr];
            if (typeof window[saveFn] === 'function') window[saveFn]();
        }

        // ========== Lịch trực trưa Functions ==========
        
        // Initialize Lịch trực trưa calendar
        function initTructruaCalendar() {
            renderTructruaCalendar();
        }

        // Render Lịch trực trưa calendar - 5 tháng (chu kỳ 25-24)
        function renderTructruaCalendar() {
            const container = document.getElementById('tructruaCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const numCycles = 5;
            container.innerHTML = '';
            container.style.display = 'flex';
            container.style.gap = '20px';
            container.style.flexWrap = 'wrap';
            container.style.maxWidth = '100%';
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderTructruaMonthCycle(cycleStart, cycleEnd);
                container.appendChild(monthEl);
            }
        }
        function renderTructruaMonthCycle(cycleStart, cycleEnd) {
            const month = document.createElement('div');
            month.style.cssText = 'flex: 0 1 100%; width: 100%; min-width: 100%; max-width: 100%; background: #fff; border-radius: 10px; padding: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);';
            const title = document.createElement('div');
            title.style.cssText = 'text-align: center; font-weight: 700; margin-bottom: 8px;';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            title.textContent = `Lịch trực trưa tháng ${monthNum}/${year} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
            month.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(7,1fr); gap: 8px;';
            ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.cssText = 'text-align: center; font-size: 14px; color: #666;';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            for (let i = 0; i < startOffset; i++) grid.appendChild(document.createElement('div'));
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const todayForCompare = new Date();
            todayForCompare.setHours(0, 0, 0, 0);
            allDates.forEach(date => {
                        const dateStr = formatDateForStorage(date);
                const isPast = date < todayForCompare;
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && date.getMonth() === todayForCompare.getMonth() && date.getDate() === todayForCompare.getDate();
                const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                const doctorName = (tructruaData[dateStr] || '').replace(/"/g, '&quot;');
                        const hasEditPermission = hasPermission('tructrua');
                        const shouldDisable = isPast || !hasEditPermission;
                        const disabledAttr = shouldDisable ? 'disabled' : '';
                        const disabledStyle = shouldDisable ? 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;' : '';
                const dayCell = document.createElement('div');
                dayCell.style.cssText = `border: ${isToday ? '3px solid #ffc107' : '1px solid #e6e9ef'}; border-radius: 6px; padding: 8px; background: ${isHoliday ? '#d32f2f' : (isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#f8fafc'))}; min-height: 80px; display: flex; flex-direction: column; gap: 4px;`;
                if (isHoliday) dayCell.style.color = '#fff';
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.cssText = 'font-size: 12px; font-weight: 600;';
                dayCell.appendChild(dayLabel);
                if (isHoliday) {
                    const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.cssText = 'font-size: 11px; margin-bottom: 4px; font-weight: 500;';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.value = tructruaData[dateStr] || '';
                input.placeholder = 'Bác sĩ';
                input.setAttribute('data-date', dateStr);
                if (shouldDisable) input.disabled = true;
                input.style.cssText = 'padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                input.onchange = function() { updateTructruaDate(dateStr, this.value); };
                dayCell.appendChild(input);
                grid.appendChild(dayCell);
            });
            month.appendChild(grid);
            return month;
        }
        // Update doctor name for a specific date
        function updateTructruaDate(dateStr, doctorName) {
            // Kiểm tra ngày đã qua
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateObj = new Date(dateStr + 'T00:00:00');
            if (dateObj < today) {
                alert('Không thể chỉnh sửa ngày đã qua.');
                // Restore previous value
                const input = document.querySelector(`#tructruaCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = tructruaData[dateStr] || '';
                }
                return;
            }
            
            if (!hasPermission('tructrua')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                // Restore previous value
                const input = document.querySelector(`#tructruaCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = tructruaData[dateStr] || '';
                }
                return;
            }
            
            if (doctorName && doctorName.trim()) {
                tructruaData[dateStr] = doctorName.trim();
            } else {
                delete tructruaData[dateStr];
            }
            
            saveTructruaData();
        }

        // Save data to localStorage
        function saveTructruaData() {
            localStorage.setItem('tructruaData', JSON.stringify(tructruaData));
        }

        // ========== Lịch Tiểu Phẫu Functions ==========
        
        // Initialize Lịch tiểu phẫu calendar
        function inittieuphauCalendar() {
            rendertieuphauCalendar();
        }
        
        // Render Lịch tiểu phẫu calendar - 5 tháng (chu kỳ 25-24)
        function rendertieuphauCalendar() {
            const container = document.getElementById('tieuphauCalendarContainer');
            if (!container) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const numCycles = 5;
            container.innerHTML = '';
            container.style.display = 'flex';
            container.style.gap = '20px';
            container.style.flexWrap = 'wrap';
            container.style.maxWidth = '100%';
            for (let i = 0; i < numCycles; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                const monthEl = renderTieuphauMonthCycle(cycleStart, cycleEnd);
                container.appendChild(monthEl);
            }
        }
        function renderTieuphauMonthCycle(cycleStart, cycleEnd) {
            const month = document.createElement('div');
            month.style.cssText = 'flex: 0 1 100%; width: 100%; min-width: 100%; max-width: 100%; background: #fff; border-radius: 10px; padding: 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.06);';
            const title = document.createElement('div');
            title.style.cssText = 'text-align: center; font-weight: 700; margin-bottom: 8px;';
            const monthNum = cycleEnd.getMonth() + 1;
            const year = cycleEnd.getFullYear();
            title.textContent = `Lịch tiểu phẫu tháng ${monthNum}/${year} (25/${cycleStart.getMonth() + 1} - 24/${cycleEnd.getMonth() + 1})`;
            month.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(7,1fr); gap: 8px;';
            ['T2','T3','T4','T5','T6','T7','CN'].forEach(w => {
                const wEl = document.createElement('div');
                wEl.style.cssText = 'text-align: center; font-size: 14px; color: #666;';
                wEl.textContent = w;
                grid.appendChild(wEl);
            });
            const firstWeekday = cycleStart.getDay();
            const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
            for (let i = 0; i < startOffset; i++) grid.appendChild(document.createElement('div'));
            const allDates = [];
            let currentDate = new Date(cycleStart);
            while (currentDate <= cycleEnd) {
                allDates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const todayForCompare = new Date();
            todayForCompare.setHours(0, 0, 0, 0);
            allDates.forEach(date => {
                        const dateStr = formatDateForStorage(date);
                const isPast = date < todayForCompare;
                const isToday = date.getFullYear() === todayForCompare.getFullYear() && date.getMonth() === todayForCompare.getMonth() && date.getDate() === todayForCompare.getDate();
                const isHoliday = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                const doctorName = (tieuphauData[dateStr] || '').replace(/"/g, '&quot;');
                        const hasEditPermission = hasPermission('tieuphau');
                        const shouldDisable = isPast || !hasEditPermission;
                        const disabledAttr = shouldDisable ? 'disabled' : '';
                        const disabledStyle = shouldDisable ? 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;' : '';
                const dayCell = document.createElement('div');
                dayCell.style.cssText = `border: ${isToday ? '3px solid #ffc107' : '1px solid #e6e9ef'}; border-radius: 6px; padding: 8px; background: ${isHoliday ? '#d32f2f' : (isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#f8fafc'))}; min-height: 80px; display: flex; flex-direction: column; gap: 4px;`;
                if (isHoliday) dayCell.style.color = '#fff';
                const dayLabel = document.createElement('div');
                dayLabel.textContent = formatDateWithWeekday(date);
                dayLabel.style.cssText = 'font-size: 12px; font-weight: 600;';
                dayCell.appendChild(dayLabel);
                if (isHoliday) {
                    const hl = typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    if (hl.label) {
                        const holidayBadge = document.createElement('div');
                        holidayBadge.textContent = '🏮 ' + hl.label + (hl.lunar ? ' (' + hl.lunar + ' AL)' : '');
                        holidayBadge.style.cssText = 'font-size: 11px; margin-bottom: 4px; font-weight: 500;';
                        dayCell.appendChild(holidayBadge);
                    }
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.value = tieuphauData[dateStr] || '';
                input.placeholder = 'Bác sĩ';
                input.setAttribute('data-date', dateStr);
                if (shouldDisable) input.disabled = true;
                input.style.cssText = 'padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; ' + disabledStyle;
                input.onchange = function() { updatetieuphauDate(dateStr, this.value); };
                dayCell.appendChild(input);
                grid.appendChild(dayCell);
            });
            month.appendChild(grid);
            return month;
        }
        // Update doctor name for a specific date
        function updatetieuphauDate(dateStr, doctorName) {
            // Kiểm tra ngày đã qua
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateObj = new Date(dateStr + 'T00:00:00');
            if (dateObj < today) {
                alert('Không thể chỉnh sửa ngày đã qua.');
                // Restore previous value
                const input = document.querySelector(`#tieuphauCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = tieuphauData[dateStr] || '';
                }
                return;
            }
            
            if (!hasPermission('tieuphau')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                // Restore previous value
                const input = document.querySelector(`#tieuphauCalendarContainer input[data-date="${dateStr}"]`);
                if (input) {
                    input.value = tieuphauData[dateStr] || '';
                }
                return;
            }
            
            if (doctorName && doctorName.trim()) {
                tieuphauData[dateStr] = doctorName.trim();
            } else {
                delete tieuphauData[dateStr];
            }
            
            savetieuphauData();
        }
        
        // Save data to localStorage
        function savetieuphauData() {
            localStorage.setItem('tieuphauData', JSON.stringify(tieuphauData));
            // Tự động cập nhật lịch làm việc nếu đang mở tab đó
            const lichlamviecTab = document.getElementById('lichlamviec');
            if (lichlamviecTab && lichlamviecTab.style.display !== 'none') {
                setTimeout(() => {
                    if (typeof renderLichlamviecTable === 'function') {
                        renderLichlamviecTable();
                    }
                }, 100);
            }
        }

        // ========== Lịch Livetream Functions ==========
        
        // Lấy danh sách bác sĩ cho ô nhập livetream (từ danh sách đã chọn, hoặc toàn bộ nếu chưa chọn)
        function getLivetreamDoctorListForInput() {
            if (Array.isArray(livetreamDoctorList) && livetreamDoctorList.length > 0) {
                return livetreamDoctorList;
            }
            return typeof getAllDoctorsForLamviechangngay === 'function' 
                ? getAllDoctorsForLamviechangngay().map(d => d.displayName || d.name) 
                : [];
        }

        // Mở modal chọn danh sách bác sĩ livetream
        function openLivetreamDoctorListModal() {
            if (!hasPermission('livetream')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            let modal = document.getElementById('livetreamDoctorListModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'livetreamDoctorListModal';
                modal.className = 'login-modal';
                modal.innerHTML = `
                    <div class="login-box" style="max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h2 style="margin: 0;">📋 Danh sách bác sĩ livetream</h2>
                            <button type="button" class="login-modal-close" onclick="closeLivetreamDoctorListModal()" aria-label="Đóng">×</button>
                        </div>
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">Tick chọn các bác sĩ có thể livestream. Ô nhập tên sẽ hiển thị danh sách này để chọn hoặc gõ trực tiếp.</p>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button type="button" onclick="livetreamSelectAllDoctors(true)" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Chọn tất cả</button>
                            <button type="button" onclick="livetreamSelectAllDoctors(false)" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Bỏ chọn tất cả</button>
                        </div>
                        <div id="livetreamDoctorListContainer" style="flex: 1; overflow-y: auto; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #f8f9fa;"></div>
                        <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end;">
                            <button type="button" onclick="closeLivetreamDoctorListModal()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Hủy</button>
                            <button type="button" onclick="saveLivetreamDoctorListFromModal()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Lưu</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            const container = document.getElementById('livetreamDoctorListContainer');
            if (!container) return;
            const allDoctors = typeof getAllDoctorsForLamviechangngay === 'function' ? getAllDoctorsForLamviechangngay() : [];
            const selectedSet = new Set((livetreamDoctorList || []).map(n => normalizeKey(n)));
            container.innerHTML = '';
            allDoctors.forEach(doc => {
                const displayName = doc.displayName || doc.name || '';
                const key = normalizeKey(displayName);
                const checked = selectedSet.has(key) || (livetreamDoctorList.length === 0 && selectedSet.size === 0);
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px;';
                label.innerHTML = `
                    <input type="checkbox" data-doctor-name="${displayName.replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 14px;">${displayName}</span>
                `;
                container.appendChild(label);
            });
            modal.classList.add('active');
        }

        function livetreamSelectAllDoctors(checked) {
            document.querySelectorAll('#livetreamDoctorListContainer input[type="checkbox"]').forEach(cb => cb.checked = checked);
        }

        function saveLivetreamDoctorListFromModal() {
            const checkboxes = document.querySelectorAll('#livetreamDoctorListContainer input[type="checkbox"]:checked');
            livetreamDoctorList = Array.from(checkboxes).map(cb => cb.getAttribute('data-doctor-name'));
            StorageUtil.saveJson(STORAGE_KEYS.livetreamDoctorList, livetreamDoctorList);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeLivetreamDoctorListModal();
            renderLivetreamTable();
            alert('✅ Đã lưu danh sách bác sĩ livetream.');
        }

        function closeLivetreamDoctorListModal() {
            const modal = document.getElementById('livetreamDoctorListModal');
            if (modal) modal.classList.remove('active');
        }

        function initLivetreamTable() {
            if (livetreamData.length === 0) {
                // Không tự động tạo dòng trống, để admin tự thêm khi cần
            }
            renderLivetreamTable();
        }

        // Render Livetream table
        function renderLivetreamTable() {
            const tbody = document.getElementById('livetreamTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            if (livetreamData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">Chưa có dữ liệu. Nhấn "Thêm dòng mới" để bắt đầu.</td></tr>';
                return;
            }
            
            // Tạo datalist cho dropdown (dùng chung cho tất cả ô tên)
            const doctorOptions = getLivetreamDoctorListForInput();
            let datalistEl = document.getElementById('livetreamDoctorsDatalist');
            if (!datalistEl) {
                datalistEl = document.createElement('datalist');
                datalistEl.id = 'livetreamDoctorsDatalist';
                document.body.appendChild(datalistEl);
            }
            datalistEl.innerHTML = doctorOptions.map(n => `<option value="${(n || '').replace(/"/g, '&quot;')}">`).join('');
            
            livetreamData.forEach((row) => {
                const tr = document.createElement('tr');
                
                const hasEditPermission = hasPermission('livetream');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deleteLivetreamRow(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <input type="text" 
                               list="livetreamDoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.personName || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateLivetreamRow(${row.id}, 'personName', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.content || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập nội dung livestream"
                               onchange="updateLivetreamRow(${row.id}, 'content', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td>
                        <input type="date" 
                               ${disabledAttr}
                               value="${row.date || ''}" 
                               onchange="updateLivetreamRow(${row.id}, 'date', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addLivetreamRow() {
            if (!hasPermission('livetream')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            livetreamData.push({
                id: Date.now(),
                personName: '',
                content: '',
                date: ''
            });
            saveLivetreamData();
            renderLivetreamTable();
        }

        // Delete row
        function deleteLivetreamRow(id) {
            if (!hasPermission('livetream')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                livetreamData = livetreamData.filter(row => row.id !== id);
                saveLivetreamData();
                renderLivetreamTable();
            }
        }

        // Update row data
        function updateLivetreamRow(id, field, value) {
            if (!hasPermission('livetream')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = livetreamData.find(r => r.id === id);
            if (row) {
                row[field] = value;
                saveLivetreamData();
            }
        }

        // Save data to localStorage and sync to server
        function saveLivetreamData() {
            localStorage.setItem('livetreamData', JSON.stringify(livetreamData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch Tầng 4 Functions ==========
        
        // Get all available doctors from all columns
        function getAllAvailableDoctorsForTang4(currentRowId) {
            // Get doctors from all columns
            const allDoctorsList = [
                ...(doctors.cot1 || []),
                ...(doctors.cot2 || []),
                ...(doctors.cot3 || []),
                ...(doctors.partime || []),
                ...(doctors.khac || [])
            ];
            
            // Remove duplicates based on name
            const uniqueDoctors = [];
            const seenNames = new Set();
            
            allDoctorsList.forEach(doc => {
                const doctorName = (doc.displayName || doc.name || '').trim();
                if (doctorName && !seenNames.has(doctorName)) {
                    seenNames.add(doctorName);
                    uniqueDoctors.push(doc);
                }
            });
            
            // Get already selected doctors (excluding current row)
            const selectedDoctors = tang4Data
                .filter(row => row.id !== currentRowId && row.doctor && row.doctor.trim() !== '')
                .map(row => row.doctor.trim());
            
            // Filter out already selected doctors (dùng tên hiển thị)
            return uniqueDoctors.filter(doc => {
                const doctorName = doc.displayName || doc.name || '';
                return !selectedDoctors.includes(doctorName.trim());
            });
        }
        
        function initTang4Table() {
            if (tang4Data.length === 0) {
                // Không tự động tạo dòng trống, để admin tự thêm khi cần
            }
            renderTang4Table();
            // Load notes
            const notesTextarea = document.getElementById('tang4Notes');
            if (notesTextarea) {
                notesTextarea.value = tang4Notes || '';
            }
        }

        // Render Tang4 table
        function renderTang4Table() {
            const tbody = document.getElementById('tang4TableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            if (tang4Data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">Chưa có dữ liệu. Nhấn "Thêm dòng mới" để bắt đầu.</td></tr>';
                return;
            }
            
            tang4Data.forEach((row) => {
                const tr = document.createElement('tr');
                
                // Get available doctors for this row
                const availableDoctors = getAllAvailableDoctorsForTang4(row.id);
                const currentDoctor = row.doctor || '';
                
                // Build select options (dùng tên hiển thị)
                let selectOptions = '<option value="">-- Chọn bác sĩ --</option>';
                availableDoctors.forEach(doc => {
                    const doctorName = doc.displayName || doc.name || '';
                    const selected = currentDoctor === doctorName ? 'selected' : '';
                    selectOptions += `<option value="${doctorName}" ${selected}>${doctorName}</option>`;
                });
                
                // If current doctor is selected but not in available list (already selected elsewhere), add it back
                if (currentDoctor && !availableDoctors.find(doc => (doc.displayName || doc.name || '') === currentDoctor)) {
                    selectOptions += `<option value="${currentDoctor}" selected>${currentDoctor} (đã chọn)</option>`;
                }
                
                const hasEditPermission = hasPermission('tang4');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                const deleteButton = hasEditPermission ? `<button class="delete-btn" onclick="deleteTang4Row(${row.id})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                
                tr.innerHTML = `
                    <td>
                        <select 
                               ${disabledAttr}
                               onchange="updateTang4Row(${row.id}, 'doctor', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                            ${selectOptions}
                        </select>
                    </td>
                    <td>
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.month || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập tháng hỗ trợ Tầng 4"
                               onchange="updateTang4Row(${row.id}, 'month', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="text-align: center;">
                        ${deleteButton}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Cập nhật trạng thái nút thêm dòng
            updateAddButtonsVisibility();
        }

        // Add new row
        function addTang4Row() {
            if (!hasPermission('tang4')) {
                alert('Bạn không có quyền thêm dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            tang4Data.push({
                id: Date.now(),
                doctor: '',
                month: ''
            });
            saveTang4Data();
            renderTang4Table();
        }

        // Delete row
        function deleteTang4Row(id) {
            if (!hasPermission('tang4')) {
                alert('Bạn không có quyền xóa dòng. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa dòng này?')) {
                tang4Data = tang4Data.filter(row => row.id !== id);
                saveTang4Data();
                renderTang4Table();
            }
        }

        // Update row data
        function updateTang4Row(id, field, value) {
            if (!hasPermission('tang4')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            const row = tang4Data.find(r => r.id === id);
            if (row) {
                row[field] = value;
                saveTang4Data();
                // Re-render table to update available doctors in other rows
                if (field === 'doctor') {
                    renderTang4Table();
                }
            }
        }

        // Save data to localStorage
        function saveTang4Data() {
            localStorage.setItem('tang4Data', JSON.stringify(tang4Data));
        }
        
        // Update notes
        function updateTang4Notes(value) {
            if (!hasPermission('tang4')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                // Restore previous value
                const textarea = document.getElementById('tang4Notes');
                if (textarea) {
                    textarea.value = tang4Notes || '';
                }
                return;
            }
            tang4Notes = value;
            saveTang4Notes();
        }
        
        // Save notes to localStorage
        function saveTang4Notes() {
            localStorage.setItem('tang4Notes', tang4Notes);
        }

        // ========== Lịch Hội Chẩn cột1 Functions ==========
        
        function initHoichancot1Schedule() {
            // Lưu dữ liệu mặc định nếu chưa có
            if (!localStorage.getItem('hoichancot1ScheduleData')) {
                saveHoichancot1ScheduleData();
            }
            renderHoichancot1Schedule();
        }

        // Lấy danh sách bác sĩ cột 1 cho ô nhập (dùng tên hiển thị)
        function getHoichancot1DoctorListForInput() {
            const cot1Doctors = doctors.cot1 || [];
            return cot1Doctors.map(doc => doc.displayName || doc.name || '').filter(Boolean);
        }

        // Render schedule table
        function renderHoichancot1Schedule() {
            const tbody = document.getElementById('hoichancot1ScheduleTableBody');
            const notesDiv = document.getElementById('hoichancot1Notes');
            
            if (!tbody || !notesDiv) return;

            tbody.innerHTML = '';
            
            // Tạo datalist cho ô nhập tên bác sĩ (từ danh sách cột 1)
            const doctorOptions = getHoichancot1DoctorListForInput();
            let datalistEl = document.getElementById('hoichancot1DoctorsDatalist');
            if (!datalistEl) {
                datalistEl = document.createElement('datalist');
                datalistEl.id = 'hoichancot1DoctorsDatalist';
                document.body.appendChild(datalistEl);
            }
            datalistEl.innerHTML = doctorOptions.map(n => `<option value="${(n || '').replace(/"/g, '&quot;')}">`).join('');
            
            hoichancot1ScheduleData.schedule.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                const hasEditPermission = hasPermission('hoichancot1');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                
                tr.innerHTML = `
                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; background: #f8f9fa;">
                        <input type="text" 
                               ${disabledAttr}
                               value="${(row.session || '').replace(/"/g, '&quot;')}" 
                               onchange="updateHoichancot1Schedule(${index}, 'session', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; font-weight: 600; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu2 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu2', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu3 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu3', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu4 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu4', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu5 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu5', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu6 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu6', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <input type="text" 
                               list="hoichancot1DoctorsDatalist"
                               ${disabledAttr}
                               value="${(row.thu7 || '').replace(/"/g, '&quot;')}" 
                               placeholder="Nhập hoặc chọn bác sĩ"
                               onchange="updateHoichancot1Schedule(${index}, 'thu7', this.value)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Render notes
            notesDiv.innerHTML = '';
            hoichancot1ScheduleData.notes.forEach((note, index) => {
                const noteDiv = document.createElement('div');
                noteDiv.style.marginBottom = '12px';
                noteDiv.style.display = 'flex';
                noteDiv.style.alignItems = 'flex-start';
                noteDiv.style.gap = '10px';
                
                const hasEditPermission = hasPermission('hoichancot1');
                const disabledAttr = hasEditPermission ? '' : 'disabled';
                const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
                
                noteDiv.innerHTML = `
                    <span style="color: #667eea; font-weight: 600; margin-top: 8px;">•</span>
                    <textarea 
                        ${disabledAttr}
                        onchange="updateHoichancot1Note(${index}, this.value)"
                        style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; min-height: 40px; resize: vertical; ${disabledStyle}"
                    >${(note || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                `;
                notesDiv.appendChild(noteDiv);
            });
            
            // Cập nhật trạng thái nút thêm dòng (nếu có)
            updateAddButtonsVisibility();
        }

        // Update schedule cell
        function updateHoichancot1Schedule(rowIndex, field, value) {
            if (!hasPermission('hoichancot1')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (hoichancot1ScheduleData.schedule[rowIndex]) {
                hoichancot1ScheduleData.schedule[rowIndex][field] = value;
                saveHoichancot1ScheduleData();
            }
        }

        // Update note
        function updateHoichancot1Note(noteIndex, value) {
            if (!hasPermission('hoichancot1')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            if (hoichancot1ScheduleData.notes[noteIndex] !== undefined) {
                hoichancot1ScheduleData.notes[noteIndex] = value;
                saveHoichancot1ScheduleData();
            }
        }

        // Save data to localStorage and sync to server
        function saveHoichancot1ScheduleData() {
            localStorage.setItem('hoichancot1ScheduleData', JSON.stringify(hoichancot1ScheduleData));
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch Trực Thường Trú Functions ==========
        
        // Lấy danh sách bác sĩ cho ô nhập trực thường trú (từ danh sách đã chọn, hoặc toàn bộ nếu chưa chọn)
        function getTructhuongtruDoctorListForInput() {
            if (Array.isArray(tructhuongtruDoctorList) && tructhuongtruDoctorList.length > 0) {
                return tructhuongtruDoctorList;
            }
            return typeof getAllDoctorsForLamviechangngay === 'function' 
                ? getAllDoctorsForLamviechangngay().map(d => d.displayName || d.name) 
                : [];
        }

        // Mở modal chọn danh sách bác sĩ trực thường trú
        function openTructhuongtruDoctorListModal() {
            if (!hasPermission('tructhuongtru')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            let modal = document.getElementById('tructhuongtruDoctorListModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'tructhuongtruDoctorListModal';
                modal.className = 'login-modal';
                modal.innerHTML = `
                    <div class="login-box" style="max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h2 style="margin: 0;">📋 Danh sách bác sĩ trực thường trú</h2>
                            <button type="button" class="login-modal-close" onclick="closeTructhuongtruDoctorListModal()" aria-label="Đóng">×</button>
                        </div>
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">Tick chọn các bác sĩ có thể trực thường trú. Ô nhập sẽ hiển thị danh sách này để chọn hoặc gõ trực tiếp.</p>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button type="button" onclick="tructhuongtruSelectAllDoctors(true)" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Chọn tất cả</button>
                            <button type="button" onclick="tructhuongtruSelectAllDoctors(false)" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Bỏ chọn tất cả</button>
                        </div>
                        <div id="tructhuongtruDoctorListContainer" style="flex: 1; overflow-y: auto; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #f8f9fa;"></div>
                        <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end;">
                            <button type="button" onclick="closeTructhuongtruDoctorListModal()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Hủy</button>
                            <button type="button" onclick="saveTructhuongtruDoctorListFromModal()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Lưu</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            const container = document.getElementById('tructhuongtruDoctorListContainer');
            if (!container) return;
            const allDoctors = typeof getAllDoctorsForLamviechangngay === 'function' ? getAllDoctorsForLamviechangngay() : [];
            const selectedSet = new Set((tructhuongtruDoctorList || []).map(n => normalizeKey(n)));
            container.innerHTML = '';
            allDoctors.forEach(doc => {
                const displayName = doc.displayName || doc.name || '';
                const key = normalizeKey(displayName);
                const checked = selectedSet.has(key) || (tructhuongtruDoctorList.length === 0 && selectedSet.size === 0);
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px;';
                label.innerHTML = `
                    <input type="checkbox" data-doctor-name="${displayName.replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 14px;">${displayName}</span>
                `;
                container.appendChild(label);
            });
            modal.classList.add('active');
        }

        function tructhuongtruSelectAllDoctors(checked) {
            document.querySelectorAll('#tructhuongtruDoctorListContainer input[type="checkbox"]').forEach(cb => cb.checked = checked);
        }

        function saveTructhuongtruDoctorListFromModal() {
            const checkboxes = document.querySelectorAll('#tructhuongtruDoctorListContainer input[type="checkbox"]:checked');
            tructhuongtruDoctorList = Array.from(checkboxes).map(cb => cb.getAttribute('data-doctor-name'));
            StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruDoctorList, tructhuongtruDoctorList);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeTructhuongtruDoctorListModal();
            renderTructhuongtruTable();
            alert('✅ Đã lưu danh sách bác sĩ trực thường trú.');
        }

        function closeTructhuongtruDoctorListModal() {
            const modal = document.getElementById('tructhuongtruDoctorListModal');
            if (modal) modal.classList.remove('active');
        }

        // Initialize Lịch trực thường trú table
        function initTructhuongtruTable() {
            renderTructhuongtruTable();
        }
        
        // Render Lịch trực thường trú table
        function renderTructhuongtruTable() {
            const tbody = document.getElementById('tructhuongtruTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            // Tạo datalist cho dropdown (dùng chung cho tất cả ô)
            const doctorOptions = getTructhuongtruDoctorListForInput();
            let datalistEl = document.getElementById('tructhuongtruDoctorsDatalist');
            if (!datalistEl) {
                datalistEl = document.createElement('datalist');
                datalistEl.id = 'tructhuongtruDoctorsDatalist';
                document.body.appendChild(datalistEl);
            }
            datalistEl.innerHTML = doctorOptions.map(n => `<option value="${(n || '').replace(/"/g, '&quot;')}">`).join('');
            
            const tr = document.createElement('tr');
            
            const hasEditPermission = hasPermission('tructhuongtru');
            const disabledAttr = hasEditPermission ? '' : 'disabled';
            const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
            
            const days = [
                { key: 'thu2', label: 'Thứ 2' },
                { key: 'thu3', label: 'Thứ 3' },
                { key: 'thu4', label: 'Thứ 4' },
                { key: 'thu5', label: 'Thứ 5' },
                { key: 'thu6', label: 'Thứ 6' },
                { key: 'thu7', label: 'Thứ 7' },
                { key: 'cn', label: 'Chủ nhật' }
            ];
            
            days.forEach(day => {
                const td = document.createElement('td');
                td.style.padding = '12px';
                td.style.border = '1px solid #ddd';
                td.style.textAlign = 'center';
                
                td.innerHTML = `
                    <input type="text" 
                           list="tructhuongtruDoctorsDatalist"
                           ${disabledAttr}
                           value="${(tructhuongtruData[day.key] || '').replace(/"/g, '&quot;')}" 
                           placeholder="Nhập hoặc chọn bác sĩ"
                           onchange="updateTructhuongtruData('${day.key}', this.value)"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                `;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        }
        
        // Update data
        function updateTructhuongtruData(dayKey, value) {
            if (!hasPermission('tructhuongtru')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            tructhuongtruData[dayKey] = value;
            saveTructhuongtruData();
        }
        
        // Save data to localStorage và đồng bộ lên server
        function saveTructhuongtruData() {
            StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruData, tructhuongtruData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch Khám Chủ Nhật Functions ==========
        
        // Migration: Chuyển đổi dữ liệu cũ sang dữ liệu mới
        (function migrateLamviechangngayData() {
            if (lamviechangngayData && typeof lamviechangngayData === 'object') {
                let hasChanges = false;
                
                // Kiểm tra format cũ: { thu2: '', thu3: '', ... }
                const hasOldFormat1 = 'thu2' in lamviechangngayData || 'thu3' in lamviechangngayData || 
                                     'thu4' in lamviechangngayData || 'thu5' in lamviechangngayData || 
                                     'thu6' in lamviechangngayData || 'thu7' in lamviechangngayData || 
                                     'cn' in lamviechangngayData;
                
                if (hasOldFormat1) {
                    console.log('⚠️ Phát hiện dữ liệu cũ (format theo thứ). Đang chuyển sang format mới...');
                    lamviechangngayData = {};
                    hasChanges = true;
                } else {
                    // Kiểm tra format cũ: { "YYYY-MM-DD": { "sang": "...", "chieu": "..." } }
                    // Chuyển sang format mới: { "YYYY-MM-DD": { "sang_caugiay": "...", "sang_longbien": "...", "chieu_caugiay": "...", "chieu_longbien": "..." } }
                    for (const dateKey in lamviechangngayData) {
                        const dayData = lamviechangngayData[dateKey];
                        if (dayData && typeof dayData === 'object') {
                            if ('sang' in dayData || 'chieu' in dayData) {
                                // Có format cũ, chuyển đổi
                                const newData = {};
                                if (dayData.sang) {
                                    newData.sang_caugiay = dayData.sang;
                                    newData.sang_longbien = '';
                                } else {
                                    newData.sang_caugiay = '';
                                    newData.sang_longbien = '';
                                }
                                if (dayData.chieu) {
                                    newData.chieu_caugiay = dayData.chieu;
                                    newData.chieu_longbien = '';
                                } else {
                                    newData.chieu_caugiay = '';
                                    newData.chieu_longbien = '';
                                }
                                lamviechangngayData[dateKey] = newData;
                                hasChanges = true;
                            }
                        }
                    }
                }
                
                // Migration: chuyển từ 4 slot (sang_caugiay, sang_longbien, chieu_caugiay, chieu_longbien) sang theo phòng (r1, r2, r3, r4)
                const oldKeys = ['sang_caugiay', 'sang_longbien', 'chieu_caugiay', 'chieu_longbien'];
                const roomIds = (lamviechangngayRooms || []).slice(0, 4).map(r => r.id);
                for (const dateKey in lamviechangngayData) {
                    const dayData = lamviechangngayData[dateKey];
                    if (!dayData || typeof dayData !== 'object') continue;
                    let needConvert = false;
                    oldKeys.forEach(k => { if (k in dayData) needConvert = true; });
                    if (!needConvert) continue;
                    const newDay = {};
                    roomIds.forEach((rid, i) => {
                        newDay[rid] = (dayData[oldKeys[i]] || '').trim();
                    });
                    oldKeys.forEach(k => { delete dayData[k]; });
                    Object.assign(dayData, newDay);
                    hasChanges = true;
                }
                
                // Migration: từ format roomId -> string sang slot_roomId -> string (1 bác sĩ/phòng)
                const cgIds = (lamviechangngayRoomsCauGiay || []).map(r => r.id);
                const lbIds = (lamviechangngayRoomsLongBien || []).map(r => r.id);
                for (const dateKey in lamviechangngayData) {
                    const dayData = lamviechangngayData[dateKey];
                    if (!dayData || typeof dayData !== 'object') continue;
                    const keys = Object.keys(dayData);
                    const isNewFormat = keys.some(k => k.indexOf('sang_caugiay_') === 0 || k.indexOf('chieu_caugiay_') === 0);
                    const isCurrentFormat = keys.some(k => k.indexOf('caugiay_') === 0 || k.indexOf('longbien_') === 0);
                    if (isNewFormat || isCurrentFormat) continue;
                    const newDay = {};
                    keys.forEach(roomId => {
                        const val = dayData[roomId];
                        const str = (typeof val === 'string' ? val : (Array.isArray(val) ? (val[0] || '') : '')).trim();
                        if (cgIds.indexOf(roomId) !== -1) {
                            newDay['sang_caugiay_' + roomId] = str;
                            newDay['chieu_caugiay_' + roomId] = '';
                        } else if (lbIds.indexOf(roomId) !== -1) {
                            newDay['sang_longbien_' + roomId] = str;
                            newDay['chieu_longbien_' + roomId] = '';
                        }
                    });
                    Object.keys(newDay).forEach(k => { dayData[k] = newDay[k]; });
                    keys.forEach(k => { if (newDay[k] === undefined) delete dayData[k]; });
                    hasChanges = true;
                }
                
                // Chuẩn hóa: ô nào đang lưu mảng [doc1, doc2, doc3] thì chuyển thành string (doc1)
                for (const dateKey in lamviechangngayData) {
                    const dayData = lamviechangngayData[dateKey];
                    if (!dayData || typeof dayData !== 'object') continue;
                    for (const k of Object.keys(dayData)) {
                        const v = dayData[k];
                        if (Array.isArray(v)) {
                            dayData[k] = (v[0] || '').trim();
                            hasChanges = true;
                        }
                    }
                }
                // Migration: từ sang/chiều sang 1 ca/ngày — sang_caugiay_* -> caugiay_*, sang_longbien_* -> longbien_*, xóa chieu_*
                for (const dateKey in lamviechangngayData) {
                    const dayData = lamviechangngayData[dateKey];
                    if (!dayData || typeof dayData !== 'object') continue;
                    const hasOldSlotKeys = Object.keys(dayData).some(k => k.indexOf('sang_caugiay_') === 0 || k.indexOf('chieu_caugiay_') === 0 || k.indexOf('sang_longbien_') === 0 || k.indexOf('chieu_longbien_') === 0);
                    if (!hasOldSlotKeys) continue;
                    cgIds.forEach(roomId => {
                        const v = dayData['sang_caugiay_' + roomId] || dayData['chieu_caugiay_' + roomId];
                        const str = (Array.isArray(v) ? (v[0] || '') : (typeof v === 'string' ? v : '')) || '';
                        dayData['caugiay_' + roomId] = str.trim();
                    });
                    lbIds.forEach(roomId => {
                        const v = dayData['sang_longbien_' + roomId] || dayData['chieu_longbien_' + roomId];
                        const str = (Array.isArray(v) ? (v[0] || '') : (typeof v === 'string' ? v : '')) || '';
                        dayData['longbien_' + roomId] = str.trim();
                    });
                    ['sang_caugiay_', 'chieu_caugiay_', 'sang_longbien_', 'chieu_longbien_'].forEach(prefix => {
                        [...cgIds, ...lbIds].forEach(rid => { if (dayData[prefix + rid] !== undefined) delete dayData[prefix + rid]; });
                    });
                    hasChanges = true;
                }
                // Đồng bộ dữ liệu Chủ nhật: khamcaugiayData.sundayDoctor / khamlongbienData.sundayDoctor -> lamviechangngayData (để tab Lịch khám chủ nhật, Cầu Giấy, Long Biên dùng chung 1 nguồn)
                const cgRooms = lamviechangngayRoomsCauGiay || [];
                const lbRooms = lamviechangngayRoomsLongBien || [];
                const firstCgId = cgRooms[0] && cgRooms[0].id;
                const firstLbId = lbRooms[0] && lbRooms[0].id;
                for (const dateKey in khamcaugiayData) {
                    const d = new Date(dateKey + 'T00:00:00');
                    if (d.getDay() !== 0) continue;
                    const oldSunday = (khamcaugiayData[dateKey] && khamcaugiayData[dateKey].sundayDoctor) || '';
                    if (!oldSunday) continue;
                    if (!lamviechangngayData[dateKey]) lamviechangngayData[dateKey] = {};
                    if (firstCgId && !(lamviechangngayData[dateKey]['caugiay_' + firstCgId])) {
                        lamviechangngayData[dateKey]['caugiay_' + firstCgId] = oldSunday.trim();
                        hasChanges = true;
                    }
                }
                for (const dateKey in khamlongbienData) {
                    const d = new Date(dateKey + 'T00:00:00');
                    if (d.getDay() !== 0) continue;
                    const day = khamlongbienData[dateKey];
                    const oldSunday = (day && day.sundayDoctor) || '';
                    if (!oldSunday) continue;
                    if (!lamviechangngayData[dateKey]) lamviechangngayData[dateKey] = {};
                    if (firstLbId && !(lamviechangngayData[dateKey]['longbien_' + firstLbId])) {
                        lamviechangngayData[dateKey]['longbien_' + firstLbId] = oldSunday.trim();
                        hasChanges = true;
                    }
                }
                if (hasChanges) {
                    saveLamviechangngayData();
                    console.log('✅ Đã chuyển đổi dữ liệu sang format mới (Lịch khám chủ nhật với Cầu Giấy/Long Biên)');
                }
            }
        })();
        
        // Tính toán Chủ nhật trong 5 tháng (chu kỳ 25-24) - bắt đầu từ chủ nhật đầu tiên trong chu kỳ hiện tại
        function get7Sundays() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const sundays = [];
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                let d = new Date(cycleStart);
                while (d <= cycleEnd) {
                    if (d.getDay() === 0) sundays.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
            }
            return sundays;
        }
        
        // Format date to YYYY-MM-DD for storage
        function formatDateForLamviechangngay(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Format date to DD/MM/YYYY for display
        function formatDateDisplayForLamviechangngay(date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        // Kiểm tra chủ nhật đã qua (trước hôm nay)
        function isLamviechangngayDatePast(dateKey) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = formatDateForLamviechangngay(today);
            return dateKey < todayStr;
        }
        
        // Lấy danh sách tất cả bác sĩ (từ các nhóm)
        function getAllDoctorsForLamviechangngay() {
            const groups = ['lanhdao', 'cot1', 'cot2', 'cot3', 'partime', 'khac'];
            const list = [];
            const seen = new Set();
            groups.forEach(g => {
                (doctors[g] || []).forEach(doc => {
                    const name = doc.name || doc.displayName || '';
                    if (name && !seen.has(normalizeKey(name))) {
                        seen.add(normalizeKey(name));
                        list.push({ name, displayName: doc.displayName || name });
                    }
                });
            });
            return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        // Lấy danh sách bác sĩ cho ô nhập (từ danh sách đã chọn, hoặc toàn bộ nếu chưa chọn)
        function getLamviechangngayDoctorListForInput() {
            if (Array.isArray(lamviechangngayDoctorList) && lamviechangngayDoctorList.length > 0) {
                return lamviechangngayDoctorList;
            }
            return getAllDoctorsForLamviechangngay().map(d => d.displayName || d.name);
        }

        // Mở modal chọn danh sách bác sĩ khám chủ nhật
        function openLamviechangngayDoctorListModal() {
            if (!hasPermission('lamviechangngay')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            let modal = document.getElementById('lamviechangngayDoctorListModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'lamviechangngayDoctorListModal';
                modal.className = 'login-modal';
                modal.innerHTML = `
                    <div class="login-box" style="max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h2 style="margin: 0;">📋 Danh sách bác sĩ khám chủ nhật</h2>
                            <button type="button" class="login-modal-close" onclick="closeLamviechangngayDoctorListModal()" aria-label="Đóng">×</button>
                        </div>
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">Tick chọn các bác sĩ có thể khám chủ nhật. Ô nhập sẽ hiển thị danh sách này để chọn hoặc gõ trực tiếp.</p>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button type="button" onclick="lamviechangngaySelectAllDoctors(true)" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Chọn tất cả</button>
                            <button type="button" onclick="lamviechangngaySelectAllDoctors(false)" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Bỏ chọn tất cả</button>
                        </div>
                        <div id="lamviechangngayDoctorListContainer" style="flex: 1; overflow-y: auto; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #f8f9fa;"></div>
                        <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end;">
                            <button type="button" onclick="closeLamviechangngayDoctorListModal()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Hủy</button>
                            <button type="button" onclick="saveLamviechangngayDoctorListFromModal()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Lưu</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            const container = document.getElementById('lamviechangngayDoctorListContainer');
            if (!container) return;
            const allDoctors = getAllDoctorsForLamviechangngay();
            const selectedSet = new Set((lamviechangngayDoctorList || []).map(n => normalizeKey(n)));
            container.innerHTML = '';
            allDoctors.forEach(doc => {
                const displayName = doc.displayName || doc.name || '';
                const key = normalizeKey(displayName);
                const checked = selectedSet.has(key) || (lamviechangngayDoctorList.length === 0 && selectedSet.size === 0);
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px;';
                label.innerHTML = `
                    <input type="checkbox" data-doctor-name="${displayName.replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 14px;">${displayName}</span>
                `;
                container.appendChild(label);
            });
            modal.classList.add('active');
        }

        function lamviechangngaySelectAllDoctors(checked) {
            document.querySelectorAll('#lamviechangngayDoctorListContainer input[type="checkbox"]').forEach(cb => cb.checked = checked);
        }

        function saveLamviechangngayDoctorListFromModal() {
            const checkboxes = document.querySelectorAll('#lamviechangngayDoctorListContainer input[type="checkbox"]:checked');
            lamviechangngayDoctorList = Array.from(checkboxes).map(cb => cb.getAttribute('data-doctor-name'));
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayDoctorList, lamviechangngayDoctorList);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeLamviechangngayDoctorListModal();
            renderLamviechangngayTable();
            alert('✅ Đã lưu danh sách bác sĩ khám chủ nhật.');
        }

        function closeLamviechangngayDoctorListModal() {
            const modal = document.getElementById('lamviechangngayDoctorListModal');
            if (modal) modal.classList.remove('active');
        }

        // Initialize Lịch khám chủ nhật table
        function initLamviechangngayTable() {
            renderLamviechangngayTable();
        }
        
        // Cấu trúc slot: mỗi ngày 1 ca khám (không chia sáng/chiều). Chỉ 2 khu: Cầu Giấy, Long Biên
        const LAMVIECHANGNGAY_SLOTS = [
            { label: 'Lịch khám Cầu Giấy', key: 'caugiay', rooms: () => lamviechangngayRoomsCauGiay || [] },
            { label: 'Lịch khám Long Biên', key: 'longbien', rooms: () => lamviechangngayRoomsLongBien || [] }
        ];
        
        // Render Lịch khám chủ nhật table: mỗi phòng 1 bác sĩ/ngày, chọn từ danh sách bác sĩ khám chủ nhật
        function renderLamviechangngayTable() {
            const thead = document.getElementById('lamviechangngayTableHeader');
            const tbody = document.getElementById('lamviechangngayTableBody');
            if (!thead || !tbody) return;

            const sundays = get7Sundays();
            thead.innerHTML = '';
            tbody.innerHTML = '';
            
            const th1 = document.createElement('th');
            th1.textContent = 'Lịch khám chủ nhật';
            th1.style.cssText = 'padding:10px;text-align:center;border:1px solid #ddd;background:#667eea;color:white;min-width:140px;';
            thead.appendChild(th1);
            const th2 = document.createElement('th');
            th2.textContent = 'Phòng';
            th2.style.cssText = 'padding:10px;text-align:center;border:1px solid #ddd;background:#667eea;color:white;min-width:80px;';
            thead.appendChild(th2);
            sundays.forEach(sunday => {
                const th = document.createElement('th');
                th.textContent = 'CN ' + formatDateDisplayForLamviechangngay(sunday);
                th.style.cssText = 'padding:10px;text-align:center;border:1px solid #ddd;background:#667eea;color:white;';
                const dateKey = formatDateForLamviechangngay(sunday);
                if (isLamviechangngayDatePast(dateKey)) {
                    th.style.background = '#95a5a6';
                    th.style.opacity = '0.9';
                }
                thead.appendChild(th);
            });
            
            const hasEditPermission = hasPermission('lamviechangngay');
            const doctorOptions = getLamviechangngayDoctorListForInput();
            let datalistEl = document.getElementById('lamviechangngayDoctorsDatalist');
            if (!datalistEl) {
                datalistEl = document.createElement('datalist');
                datalistEl.id = 'lamviechangngayDoctorsDatalist';
                document.body.appendChild(datalistEl);
            }
            datalistEl.innerHTML = doctorOptions.map(n => `<option value="${(n || '').replace(/"/g, '&quot;')}">`).join('');
            
            LAMVIECHANGNGAY_SLOTS.forEach(slot => {
                const roomList = slot.rooms();
                roomList.forEach(room => {
                const tr = document.createElement('tr');
                    const tdSlot = document.createElement('td');
                    tdSlot.textContent = slot.label;
                    tdSlot.style.cssText = 'padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600;vertical-align:middle;';
                    tr.appendChild(tdSlot);
                    const tdRoom = document.createElement('td');
                    tdRoom.textContent = room.name || room.id;
                    tdRoom.style.cssText = 'padding:8px;border:1px solid #ddd;background:#fafafa;vertical-align:middle;';
                    tr.appendChild(tdRoom);
                    
                    const dataKey = slot.key + '_' + room.id;
                sundays.forEach(sunday => {
                    const dateKey = formatDateForLamviechangngay(sunday);
                    const isPast = isLamviechangngayDatePast(dateKey);
                        const dayData = lamviechangngayData[dateKey] || {};
                        const val = dayData[dataKey];
                        const currentName = (Array.isArray(val) ? (val[0] || '') : (typeof val === 'string' ? val : '')) || '';
                    
                    const td = document.createElement('td');
                        td.style.cssText = 'padding:6px;border:1px solid #ddd;vertical-align:middle;';
                        if (isPast) td.style.background = '#f8f9fa';
                        const inp = document.createElement('input');
                        inp.type = 'text';
                        inp.setAttribute('list', 'lamviechangngayDoctorsDatalist');
                        inp.placeholder = 'Chọn bác sĩ';
                        inp.value = currentName.trim();
                        inp.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;';
                        if (isPast || !hasEditPermission) inp.disabled = true;
                        inp.onchange = function() {
                            updateLamviechangngaySlotDoctor(dateKey, slot.key, room.id, this.value.trim());
                        };
                        td.appendChild(inp);
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
                });
            });
        }
        
        // Tập tên bác sĩ đã dùng trong ngày (1 bác sĩ/phòng), loại trừ ô (slotKey, roomId) đang sửa
        function getLamviechangngayUsedDoctorNamesForDate(dateKey, excludeSlotKey, excludeRoomId) {
            const used = new Set();
            const dayData = lamviechangngayData[dateKey] || {};
            LAMVIECHANGNGAY_SLOTS.forEach(slot => {
                (slot.rooms() || []).forEach(room => {
                    if (slot.key === excludeSlotKey && room.id === excludeRoomId) return;
                    const key = slot.key + '_' + room.id;
                    const val = dayData[key];
                    const n = (Array.isArray(val) ? (val[0] || '') : (typeof val === 'string' ? val : '')) || '';
                    const name = (n || '').trim();
                    if (name) {
                        used.add(normalizeKey(name));
                        used.add(name);
                    }
                });
            });
            return used;
        }
        
        function updateLamviechangngaySlotDoctor(dateKey, slotKey, roomId, value) {
            const canEdit = hasPermission('lamviechangngay') ||
                (slotKey === 'caugiay' && hasPermission('khamcaugiay')) ||
                (slotKey === 'longbien' && hasPermission('khamlongbien'));
            if (!canEdit && currentUser?.role !== 'admin') {
                alert('Bạn không có quyền chỉnh sửa.');
                return;
            }
            if (isLamviechangngayDatePast(dateKey)) return;
            const leaveKeys = getDoctorsOnLeaveForDate(dateKey);
            if (value) {
                const used = getLamviechangngayUsedDoctorNamesForDate(dateKey, slotKey, roomId);
                if (used.has(normalizeKey(value)) || used.has(value)) {
                    alert('Tên bác sĩ này đã được chọn ở phòng khác trong cùng ngày. Vui lòng chọn bác sĩ khác.');
                    renderLamviechangngayTable();
                    return;
                }
                const doctorKey = normalizeKey(value);
                if (leaveKeys.has(doctorKey)) {
                    alert('Bác sĩ này đang nghỉ phép ngày ' + dateKey + '. Vui lòng chọn bác sĩ khác.');
                    renderLamviechangngayTable();
                    return;
                }
            }
            if (!lamviechangngayData[dateKey]) lamviechangngayData[dateKey] = {};
            const dataKey = slotKey + '_' + roomId;
            lamviechangngayData[dateKey][dataKey] = value || '';
            saveLamviechangngayData();
            if (typeof renderLamviechangngayTable === 'function') renderLamviechangngayTable();
            if (typeof renderKhamCauGiayCalendar === 'function') renderKhamCauGiayCalendar();
            if (typeof renderKhamLongBienCalendar === 'function') renderKhamLongBienCalendar();
        }
        
        // Đồng bộ dữ liệu Chủ nhật từ lamviechangngay sang khamcaugiayData / khamlongbienData (để PDF, getKhamCauGiayDoctorsForDate, v.v. dùng chung)
        function syncLamviechangngayToKhamTabs() {
            Object.keys(lamviechangngayData || {}).forEach(dateKey => {
                const d = new Date(dateKey + 'T00:00:00');
                if (d.getDay() !== 0) return;
                const dayData = lamviechangngayData[dateKey] || {};
                (lamviechangngayRoomsCauGiay || []).forEach(room => {
                    const val = (dayData['caugiay_' + room.id] || '').trim();
                    if (!khamcaugiayData[dateKey]) khamcaugiayData[dateKey] = {};
                    if (val) {
                        khamcaugiayData[dateKey][room.id] = { doctor: val, khamTrua: false, kham20h: false };
                    } else {
                        delete khamcaugiayData[dateKey][room.id];
                    }
                });
                (lamviechangngayRoomsLongBien || []).forEach(room => {
                    const val = (dayData['longbien_' + room.id] || '').trim();
                    const day = getKhamLongBienDayData(dateKey);
                    if (!day.rooms) day.rooms = {};
                    if (val) {
                        day.rooms[room.id] = { morning: val, afternoon: val };
                    } else {
                        delete day.rooms[room.id];
                    }
                    if (day.early?.san || day.early?.sieuam || (day.rooms && Object.keys(day.rooms).length)) {
                        khamlongbienData[dateKey] = day;
                    } else {
                        delete khamlongbienData[dateKey];
                    }
                });
            });
            StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
            StorageUtil.saveJson(STORAGE_KEYS.khamlongbienData, khamlongbienData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        // Giữ tên cũ cho tương thích (gọi từ HTML cũ nếu có) — lưu 1 bác sĩ/phòng (string), 1 ca/ngày
        function updateLamviechangngayData(dateKey, roomId, value) {
            if (!lamviechangngayData[dateKey]) lamviechangngayData[dateKey] = {};
            const cgIds = (lamviechangngayRoomsCauGiay || []).map(r => r.id);
            const lbIds = (lamviechangngayRoomsLongBien || []).map(r => r.id);
            const v = (value || '').trim();
            if (cgIds.indexOf(roomId) !== -1) {
                lamviechangngayData[dateKey]['caugiay_' + roomId] = v;
            } else if (lbIds.indexOf(roomId) !== -1) {
                lamviechangngayData[dateKey]['longbien_' + roomId] = v;
            }
            saveLamviechangngayData();
            renderLamviechangngayTable();
        }
        
        // Save data to localStorage and sync to server; đồng bộ Chủ nhật sang tab Cầu Giấy / Long Biên
        function saveLamviechangngayData() {
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayData, lamviechangngayData);
            syncLamviechangngayToKhamTabs();
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        // ========== Quản lý phòng khám Lịch khám chủ nhật: Cầu Giấy và Long Biên riêng ==========
        function renderLamviechangngayRoomsInModal() {
            const renderList = (containerId, rooms) => {
                const container = document.getElementById(containerId);
                if (!container) return;
                container.innerHTML = '';
                (rooms || []).forEach((room) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                    div.innerHTML = `
                        <input type="text" value="${(room.name || '').replace(/"/g, '&quot;')}" data-room-id="${room.id}"
                               style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                               placeholder="Tên phòng">
                        <button class="delete-btn" onclick="removeLamviechangngayRoom('${room.id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                    `;
                    container.appendChild(div);
                });
            };
            renderList('lamviechangngayRoomsListCauGiay', lamviechangngayRoomsCauGiay || []);
            renderList('lamviechangngayRoomsListLongBien', lamviechangngayRoomsLongBien || []);
        }
        function openLamviechangngayRoomsModal() {
            if (!hasPermission('lamviechangngay') && currentUser?.role !== 'admin') return;
            renderLamviechangngayRoomsInModal();
            document.getElementById('lamviechangngayRoomsModal')?.classList.add('active');
        }
        function closeLamviechangngayRoomsModal() {
            document.getElementById('lamviechangngayRoomsModal')?.classList.remove('active');
        }
        function addLamviechangngayRoom(type) {
            const prefix = type === 'longbien' ? 'lb' : 'cg';
            const id = prefix + (Date.now().toString(36));
            const list = type === 'longbien' ? lamviechangngayRoomsLongBien : lamviechangngayRoomsCauGiay;
            list.push({ id, name: 'Phòng mới' });
            const containerId = type === 'longbien' ? 'lamviechangngayRoomsListLongBien' : 'lamviechangngayRoomsListCauGiay';
            const container = document.getElementById(containerId);
            if (container) {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;padding:10px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;';
                div.innerHTML = `
                    <input type="text" value="Phòng mới" data-room-id="${id}"
                           style="flex:1;min-width:120px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"
                           placeholder="Tên phòng">
                    <button class="delete-btn" onclick="removeLamviechangngayRoom('${id}')" style="padding:6px 12px;">🗑️ Xóa</button>
                `;
                container.appendChild(div);
            }
        }
        function collectLamviechangngayRoomsFromDOM() {
            ['lamviechangngayRoomsListCauGiay', 'lamviechangngayRoomsListLongBien'].forEach(containerId => {
                const container = document.getElementById(containerId);
                if (!container) return;
                const list = containerId.indexOf('LongBien') !== -1 ? lamviechangngayRoomsLongBien : lamviechangngayRoomsCauGiay;
                container.querySelectorAll('input[type="text"]').forEach(inp => {
                    const rid = inp.getAttribute('data-room-id');
                    const r = (list || []).find(x => x.id === rid);
                    if (r) r.name = (inp.value || '').trim() || r.name;
                });
            });
        }
        function removeLamviechangngayRoom(roomId) {
            collectLamviechangngayRoomsFromDOM();
            const removeFrom = (list, storageKey) => {
                const arr = (list || []).filter(r => r.id !== roomId);
                if (list === lamviechangngayRoomsCauGiay) lamviechangngayRoomsCauGiay = arr;
                else if (list === lamviechangngayRoomsLongBien) lamviechangngayRoomsLongBien = arr;
                for (const dateKey in lamviechangngayData) {
                    const day = lamviechangngayData[dateKey];
                    if (!day || typeof day !== 'object') continue;
                    ['sang_caugiay_', 'chieu_caugiay_', 'sang_longbien_', 'chieu_longbien_', 'caugiay_', 'longbien_'].forEach(prefix => {
                        if (day[prefix + roomId] !== undefined) delete day[prefix + roomId];
                    });
                }
                return arr;
            };
            if ((lamviechangngayRoomsCauGiay || []).some(r => r.id === roomId)) {
                lamviechangngayRoomsCauGiay = removeFrom(lamviechangngayRoomsCauGiay, STORAGE_KEYS.lamviechangngayRoomsCauGiay);
            } else {
                lamviechangngayRoomsLongBien = removeFrom(lamviechangngayRoomsLongBien, STORAGE_KEYS.lamviechangngayRoomsLongBien);
            }
            renderLamviechangngayRoomsInModal();
        }
        function saveLamviechangngayRooms() {
            collectLamviechangngayRoomsFromDOM();
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsCauGiay, lamviechangngayRoomsCauGiay);
            StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRoomsLongBien, lamviechangngayRoomsLongBien);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closeLamviechangngayRoomsModal();
            renderLamviechangngayTable();
            syncLamviechangngayToKhamTabs();
            if (typeof renderKhamCauGiayCalendar === 'function') renderKhamCauGiayCalendar();
            if (typeof renderKhamLongBienCalendar === 'function') renderKhamLongBienCalendar();
            alert('✅ Đã lưu danh sách phòng khám chủ nhật.');
        }

        // ========== Lịch Làm Việc Functions ==========
        
        // Định nghĩa các vị trí làm việc theo template
        const workPositions = [
            { id: 'tieuphau', name: 'Tiểu phẫu', shifts: ['sang', 'chieu'] },
            { id: 'noitru_t3_sang', name: 'Nội trú T3 Sáng (7h30 - 12h)', shifts: ['chan', 'le'] },
            { id: 'noitru_t3_chieu', name: 'Nội trú T3 Chiều (12h - 16h30)', shifts: ['chan', 'le'] },
            { id: 'khamsom', name: 'Khám sớm', shifts: ['full'] },
            { id: 'khamcaugiay', name: 'Khám Cầu Giấy', shifts: ['full'] },
            { id: 'hspk_t4', name: 'HSPK+T4', shifts: ['sang', 'chieu'] },
            { id: 'phongde', name: 'Phòng đẻ', shifts: ['sang', 'chieu'] },
            { id: 'phumo_pk', name: 'Phụ mổ PK', shifts: ['sang', 'chieu'] },
            { id: 'kham', name: 'Khám', shifts: ['sang', 'chieu'] },
            { id: 'tructp_trua', name: 'Trực TP (trưa)', shifts: ['full'], linkFrom: 'tieuphau' },
            { id: 'khamtrua', name: 'Khám trưa', shifts: ['full'] },
            { id: 'lichnghi', name: 'Lịch nghỉ', shifts: ['c1', 'c2c3'] },
            { id: 'truc_dn', name: 'Trực D/N', shifts: ['full'] }
        ];
        
        // Lấy màu nền cho từng vị trí làm việc
        function getPositionColor(positionId) {
            const colorMap = {
                'tieuphau': '#4A90E2',           // Moderate blue - Tiểu phẫu
                'noitru_t3_sang': '#5CB85C',     // Moderate green - Nội trú T3 Sáng
                'noitru_t3_chieu': '#5CB85C',    // Moderate green - Nội trú T3 Chiều
                'khamsom': '#FF8C94',            // Light red/salmon - Khám sớm
                'khamcaugiay': '#FF8C94',        // Light red/salmon - Khám Cầu Giấy
                'hspk_t4': '#FFD93D',            // Moderate yellow - HSPK+T4
                'phongde': '#D3D3D3',            // Light grey - Phòng đẻ
                'phumo_pk': '#4A90E2',           // Moderate blue - Phụ mổ PK
                'kham': '#FF8C42',               // Moderate orange - Khám
                'tructp_trua': '#D3D3D3',        // Light grey - Trực TP (trưa)
                'khamtrua': '#FF8C94',           // Light red/salmon - Khám trưa
                'lichnghi': '#FF6B35',           // Deep orange - Lịch nghỉ
                'truc_dn': '#FFD93D'             // Moderate yellow - Trực D/N (giống HSPK+T4)
            };
            return colorMap[positionId] || '#f8f9fa'; // Default color
        }
        
        // =========================================================
        // MODULE 3: Lịch làm việc (lichlamviecData)
        // - render/bind input theo ngày-vị trí-ca
        // - lưu `lichlamviecData` + fallback lịch nghỉ từ `quanlynghiphepData`
        // =========================================================
        // Initialize Lịch làm việc table
        function initLichlamviecTable() {
            renderLichlamviecTable();
        }
        
        // Lấy tên bác sĩ từ các lịch đã có
        function getDoctorFromSchedule(dateStr, scheduleType) {
            if (scheduleType === 'tieuphau') {
                return tieuphauData[dateStr] || '';
            } else if (scheduleType === 'khamsom') {
                return khamsomData[dateStr] || '';
            } else if (scheduleType === 'tructrua') {
                return tructruaData[dateStr] || '';
            } else if (scheduleType === 'khamcaugiay') {
                const d = new Date(dateStr + 'T00:00:00');
                if (d.getDay() === 0) {
                    const lvcn = lamviechangngayData[dateStr] || {};
                    const names = [];
                    (lamviechangngayRoomsCauGiay || []).forEach(r => {
                        const v = (lvcn['caugiay_' + r.id] || '').trim();
                        if (v) names.push(getDoctorDisplayNameAnyColumn(v) || v);
                    });
                    return names.join(', ');
                }
                const dayData = khamcaugiayData[dateStr];
                if (!dayData || typeof dayData !== 'object') return '';
                const names = [];
                (khamcaugiayRooms || []).forEach(r => {
                    const slot = getKhamCauGiaySlotData(dayData, r.id, dateStr);
                    if (slot.doctor) {
                        const n = getDoctorDisplayNameFromList(slot.doctor, khamcaugiayDoctorList) || getDoctorDisplayNameAnyColumn(slot.doctor) || slot.doctor;
                        if (n) names.push(n);
                    }
                });
                return names.join(', ');
            }
            return '';
        }
        
        // Lấy danh sách bác sĩ nghỉ từ quanlynghiphepData (bao gồm cả fixedScheduleData)
        function getDoctorsFromNghiPhep(dateStr, shift) {
            // shift có thể là 'c1' hoặc 'c2c3'
            
            // Hỗ trợ format cũ (array) và format mới (object) - giống như trong tab Quản lý nghỉ phép
            const getColumnData = (col) => {
                let dayData = quanlynghiphepData[dateStr] || { 
                    c1: { doctors: [], maxCount: 0 }, 
                    c2: { doctors: [], maxCount: 0 }, 
                    c3: { doctors: [], maxCount: 0 } 
                };
                
                let colData = dayData[col];
                if (Array.isArray(colData)) {
                    // Format cũ: array of strings
                    return { doctors: colData.map(key => ({ key: key, period: 'full' })), maxCount: 0 };
                } else if (!colData || typeof colData !== 'object') {
                    return { doctors: [], maxCount: 0 };
                } else if (!Array.isArray(colData.doctors)) {
                    return { doctors: [], maxCount: colData.maxCount || 0 };
                }
                // Format mới: { doctors: [{key, period}], maxCount: 0 }
                // Chuyển đổi nếu doctors là array of strings
                const doctors = colData.doctors.map(item => {
                    if (typeof item === 'string') {
                        return { key: item, period: 'full' };
                    } else if (item && typeof item === 'object' && item.key) {
                        return { key: item.key, period: item.period || 'full' };
                    }
                    return null;
                }).filter(item => item !== null);
                
                // Merge với fixedScheduleData (giống như trong tab Quản lý nghỉ phép)
                const dateObj = new Date(dateStr + 'T00:00:00');
                const weekday = dateObj.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
                const weekdayKey = weekday === 0 ? 7 : weekday; // Chuyển đổi: 0 (CN) -> 7, 1 (T2) -> 1, ..., 6 (T7) -> 6
                
                // Chỉ áp dụng cho Thứ 2 - Thứ 7 (1-6)
                if (weekdayKey >= 1 && weekdayKey <= 6) {
                    const fixedDoctors = getFixedScheduleForWeekday(col, weekdayKey);
                    if (fixedDoctors.length > 0) {
                        // Merge lịch nghỉ cố định với lịch nghỉ đã có (ưu tiên lịch nghỉ đã có)
                        const existingDoctorKeys = doctors
                            .filter(d => d && typeof d === 'object' && d.key)
                            .map(d => d.key);
                        
                        fixedDoctors.forEach(fixedDoctor => {
                            const fixedKey = fixedDoctor.key || fixedDoctor;
                            if (!existingDoctorKeys.includes(fixedKey)) {
                                // Chỉ thêm nếu chưa có trong lịch nghỉ đã có
                                doctors.push(fixedDoctor);
                            }
                        });
                    }
                }
                
                return { doctors: doctors, maxCount: colData.maxCount || 0 };
            };
            
            // Get doctor names với period (format mới: object {key, period})
            const getDoctorNames = (doctorData, column) => {
                if (!Array.isArray(doctorData)) return [];
                return doctorData.map(item => {
                    if (!item || typeof item !== 'object' || !item.key) return null;
                    const doctorKey = item.key;
                    const period = item.period || 'full';
                    const name = getDoctorNameByKey(doctorKey, column);
                    if (!name) return null;
                    // Thêm ký hiệu period vào tên
                    const periodLabel = period === 'morning' ? ' (Sáng)' : (period === 'afternoon' ? ' (Chiều)' : '');
                    return name + periodLabel;
                }).filter(name => name);
            };
            
            let doctorNames = [];
            
            if (shift === 'c1') {
                // Lấy từ cộtc1
                const c1Data = getColumnData('c1');
                doctorNames = getDoctorNames(c1Data.doctors, 'c1');
            } else if (shift === 'c2c3') {
                // Lấy từ cộtc2 và c3, gộp lại
                const c2Data = getColumnData('c2');
                const c3Data = getColumnData('c3');
                
                const c2Names = getDoctorNames(c2Data.doctors, 'c2');
                const c3Names = getDoctorNames(c3Data.doctors, 'c3');
                
                doctorNames = c2Names.concat(c3Names);
            }
            
            return doctorNames.join(', ');
        }
        
        // Cập nhật danh sách bác sĩ nghỉ vào quanlynghiphepData từ string
        function updateNghiPhepFromString(dateStr, shift, doctorNamesString) {
            if (!quanlynghiphepData[dateStr]) {
                quanlynghiphepData[dateStr] = {
                    c1: { doctors: [], maxCount: 0 },
                    c2: { doctors: [], maxCount: 0 },
                    c3: { doctors: [], maxCount: 0 }
                };
            }
            
            // Parse string tên bác sĩ thành array
            // Format: "Tên1, Tên2 (Sáng), Tên3 (Chiều), ..."
            const doctorNames = doctorNamesString.split(',').map(s => s.trim()).filter(s => s);
            
            if (shift === 'c1') {
                // Cập nhật cộtc1
                const newDoctors = [];
                doctorNames.forEach(nameStr => {
                    // Tách tên và period
                    let name = nameStr.trim();
                    let period = 'full';
                    
                    if (name.includes(' (Sáng)')) {
                        name = name.replace(' (Sáng)', '').trim();
                        period = 'morning';
                    } else if (name.includes(' (Chiều)')) {
                        name = name.replace(' (Chiều)', '').trim();
                        period = 'afternoon';
                    }
                    
                    // Tìm doctorKey từ tên
                    const doctorList = doctors.cot1;
                    const doctor = doctorList.find(doc => {
                        const displayName = doc.displayName || doc.name || '';
                        const fullName = doc.name || '';
                        return normalizeKey(displayName) === normalizeKey(name) || 
                               normalizeKey(fullName) === normalizeKey(name);
                    });
                    
                    if (doctor) {
                        const doctorKey = normalizeKey(doctor.name || doctor.displayName || '');
                        newDoctors.push({ key: doctorKey, period: period });
                    }
                });
                
                quanlynghiphepData[dateStr].c1.doctors = newDoctors;
            } else if (shift === 'c2c3') {
                // Cập nhật cộtc2 và c3
                // Phân chia bác sĩ vào c2 hoặc c3 dựa trên cộtcủa họ
                const c2Doctors = [];
                const c3Doctors = [];
                
                doctorNames.forEach(nameStr => {
                    // Tách tên và period
                    let name = nameStr.trim();
                    let period = 'full';
                    
                    if (name.includes(' (Sáng)')) {
                        name = name.replace(' (Sáng)', '').trim();
                        period = 'morning';
                    } else if (name.includes(' (Chiều)')) {
                        name = name.replace(' (Chiều)', '').trim();
                        period = 'afternoon';
                    }
                    
                    // Tìm doctorKey và cộtcủa bác sĩ
                    let found = false;
                    
                    // Tìm trong cộtc2
                    const doctorListC2 = doctors.cot2;
                    const doctorC2 = doctorListC2.find(doc => {
                        const displayName = doc.displayName || doc.name || '';
                        const fullName = doc.name || '';
                        return normalizeKey(displayName) === normalizeKey(name) || 
                               normalizeKey(fullName) === normalizeKey(name);
                    });
                    
                    if (doctorC2) {
                        const doctorKey = normalizeKey(doctorC2.name || doctorC2.displayName || '');
                        c2Doctors.push({ key: doctorKey, period: period });
                        found = true;
                    }
                    
                    // Nếu không tìm thấy trong c2, tìm trong c3
                    if (!found) {
                        const doctorListC3 = doctors.cot3;
                        const doctorC3 = doctorListC3.find(doc => {
                            const displayName = doc.displayName || doc.name || '';
                            const fullName = doc.name || '';
                            return normalizeKey(displayName) === normalizeKey(name) || 
                                   normalizeKey(fullName) === normalizeKey(name);
                        });
                        
                        if (doctorC3) {
                            const doctorKey = normalizeKey(doctorC3.name || doctorC3.displayName || '');
                            c3Doctors.push({ key: doctorKey, period: period });
                        }
                    }
                });
                
                quanlynghiphepData[dateStr].c2.doctors = c2Doctors;
                quanlynghiphepData[dateStr].c3.doctors = c3Doctors;
            }
            
            // Lưu lại
            StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }
        
        // Kiểm tra ngày chẵn hay lẻ (dựa vào ngày trong tháng)
        function isEvenDay(dateStr) {
            const date = new Date(dateStr + 'T00:00:00');
            return date.getDate() % 2 === 0;
        }
        
        // Render Lịch làm việc table - hiển thị nhiều bảng, mỗi bảng 2 ngày
        function renderLichlamviecTable() {
            const container = document.getElementById('lichlamviecContainer');
            if (!container) return;
            
            // Tính toán 5 tháng (chu kỳ 25-24) - tất cả ngày làm việc (bỏ Chủ nhật)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), 25);
            if (today.getDate() < 25) {
                cycleStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 25);
            }
            const dates = [];
            for (let i = 0; i < 5; i++) {
                const cycleStart = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + i, 25);
                const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 24);
                let d = new Date(cycleStart);
                while (d <= cycleEnd) {
                    if (d.getDay() !== 0) dates.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
            }
            
            // Xóa nội dung cũ
            container.innerHTML = '';
            
            // Chia dates thành các cặp 2 ngày
            for (let i = 0; i < dates.length; i += 2) {
                const datePair = dates.slice(i, i + 2);
                if (datePair.length === 0) continue;
                
                // Tạo bảng cho cặp ngày này
                const tableWrapper = document.createElement('div');
                tableWrapper.style.marginBottom = '30px';
                
                const tableContainer = document.createElement('div');
                tableContainer.style.overflowX = 'auto';
                
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.background = 'white';
                table.style.borderRadius = '8px';
                table.style.overflow = 'hidden';
                
                // Tạo header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headerRow.style.background = '#FFB6C1'; // Màu hồng cánh sen
                headerRow.style.color = '#000';
                headerRow.style.fontWeight = 'bold';
                
                // cộtVị trí làm việc
                const th1 = document.createElement('th');
                th1.textContent = 'Vị trí làm việc';
                th1.style.padding = '12px';
                th1.style.textAlign = 'center';
                th1.style.border = '1px solid #000';
                th1.style.width = '200px';
                headerRow.appendChild(th1);
                
                // cộtBuổi
                const th2 = document.createElement('th');
                th2.textContent = 'Buổi';
                th2.style.padding = '12px';
                th2.style.textAlign = 'center';
                th2.style.border = '1px solid #000';
                th2.style.width = '120px';
                headerRow.appendChild(th2);
                
                // Các cộtngày (2 ngày)
                datePair.forEach((date, dayIndex) => {
                    const dateStr = formatDateForStorage(date);
                    const dateDisplay = formatDateForDisplay(date);
                    const dayOfWeek = date.getDay();
                    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                    const dayName = dayNames[dayOfWeek];
                    const isHolidayLv = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                    const hlLv = isHolidayLv && typeof getHolidayDisplayLabel === 'function' ? getHolidayDisplayLabel(dateStr) : { label: '', lunar: '' };
                    
                    const th = document.createElement('th');
                    th.className = `day-column day-column-${dayIndex}`;
                    th.style.padding = '8px';
                    th.style.textAlign = 'center';
                    th.style.border = '1px solid #000';
                    th.style.minWidth = '150px';
                    th.style.fontSize = '12px';
                    th.style.position = 'relative';
                    if (isHolidayLv) {
                        th.style.background = '#d32f2f';
                        th.style.color = '#fff';
                    }
                    
                    // Tạo container cho nội dung header
                    const headerContent = document.createElement('div');
                    headerContent.style.position = 'relative';
                    let headerHtml = `${dayName}<br>${dateDisplay}`;
                    if (isHolidayLv && hlLv.label) {
                        headerHtml += `<br><span style="font-size:11px;font-weight:500;">🏮 ${hlLv.label}${hlLv.lunar ? ' (' + hlLv.lunar + ' AL)' : ''}</span>`;
                    }
                    headerContent.innerHTML = headerHtml;
                    
                    // Tạo nút xuất PDF ở góc trên bên phải
                    const pdfBtn = document.createElement('button');
                    pdfBtn.innerHTML = '📄';
                    pdfBtn.title = `Xuất PDF lịch làm việc ${dayName} ${dateDisplay}`;
                    pdfBtn.style.cssText = `
                        position: absolute;
                        top: 2px;
                        right: 2px;
                        width: 24px;
                        height: 24px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        transition: all 0.2s ease;
                        z-index: 10;
                        padding: 0;
                        line-height: 1;
                    `;
                    pdfBtn.onmouseover = function() {
                        this.style.background = '#5568d3';
                        this.style.transform = 'scale(1.15)';
                    };
                    pdfBtn.onmouseout = function() {
                        this.style.background = '#667eea';
                        this.style.transform = 'scale(1)';
                    };
                    pdfBtn.onclick = function(e) {
                        e.stopPropagation();
                        exportLichlamviecPDF(dateStr, dayName, dateDisplay);
                    };
                    
                    headerContent.appendChild(pdfBtn);
                    th.appendChild(headerContent);
                    headerRow.appendChild(th);
                });
                
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Tạo body
                const tbody = document.createElement('tbody');
                
                const hasEditPermission = hasPermission('lichlamviec');
                
                workPositions.forEach(position => {
                    position.shifts.forEach((shift, shiftIndex) => {
                        const row = document.createElement('tr');
                        
                        // Lấy màu nền cho hàng này
                        const rowBackgroundColor = getPositionColor(position.id);
                        const isLightColor = ['#D3D3D3', '#FFD93D', '#FF8C94'].includes(rowBackgroundColor);
                        const rowTextColor = '#000'; // Tất cả chữ màu đen
                        
                        // cộtVị trí làm việc (chỉ hiển thị ở shift đầu tiên)
                        const td1 = document.createElement('td');
                        if (shiftIndex === 0) {
                            td1.textContent = position.name;
                            td1.rowSpan = position.shifts.length;
                            td1.style.padding = '12px';
                            td1.style.textAlign = 'left';
                            td1.style.border = '1px solid #000';
                            td1.style.background = '#ff0000'; // Nền màu đỏ
                            td1.style.color = '#ffffff'; // Chữ màu trắng
                            td1.style.fontWeight = 'bold';
                            td1.style.verticalAlign = 'middle';
                        }
                        if (shiftIndex === 0) {
                            row.appendChild(td1);
                        }
                        
                        // cộtBuổi
                        const td2 = document.createElement('td');
                        let shiftName = '';
                        if (shift === 'sang') shiftName = 'Sáng';
                        else if (shift === 'chieu') shiftName = 'Chiều';
                        else if (shift === 'chan') shiftName = 'Chẵn';
                        else if (shift === 'le') shiftName = 'Lẻ';
                        else if (shift === 'c1') shiftName = 'C1';
                        else if (shift === 'c2c3') shiftName = 'C2+C3';
                        else shiftName = '';
                        td2.textContent = shiftName;
                        td2.style.padding = '8px';
                        td2.style.textAlign = 'center';
                        td2.style.border = '1px solid #000';
                        td2.style.background = rowBackgroundColor;
                        td2.style.color = rowTextColor;
                        row.appendChild(td2);
                        
                        // Các cộtngày (2 ngày)
                        datePair.forEach((date, dayIndex) => {
                            const dateStr = formatDateForStorage(date);
                            const isEven = isEvenDay(dateStr);
                            const isHolidayLvCell = typeof isHolidayCell === 'function' && isHolidayCell(dateStr);
                            const td = document.createElement('td');
                            td.className = `day-column day-column-${dayIndex}`;
                            td.style.padding = '8px';
                            td.style.textAlign = 'center';
                            td.style.border = '1px solid #000';
                            td.style.verticalAlign = 'top';
                            td.style.minHeight = '60px';
                            if (isHolidayLvCell) {
                                td.style.background = '#d32f2f';
                                td.style.color = '#fff';
                            }
                            
                            let doctorName = '';
                            
                            // Lấy dữ liệu từ các nguồn khác nhau (giữ nguyên logic cũ)
                            if (position.linkFrom === 'tieuphau') {
                                // Trực TP (trưa) - link từ Lịch tiểu phẫu
                                const tieuphauValue = getDoctorFromSchedule(dateStr, 'tieuphau');
                                td.innerHTML = `<div style="font-size: 12px; color: ${isHolidayLvCell ? '#fff' : '#000'}; padding: 4px; font-weight: 500;">${tieuphauValue || '-'}</div>`;
                                if (!isHolidayLvCell) {
                                    td.style.background = rowBackgroundColor;
                                    td.style.color = rowTextColor;
                                }
                                td.style.cursor = 'pointer';
                                td.title = 'Dữ liệu từ Lịch tiểu phẫu (click để mở tab Lịch tiểu phẫu)';
                                td.onclick = () => {
                                    switchTab('tieuphau', document.querySelector('.tabs .tab[data-tab="tieuphau"]'));
                                };
                                row.appendChild(td);
                                return;
                            } else if (position.id === 'tieuphau') {
                                // Tiểu phẫu
                                if (shift === 'sang') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Tùng';
                                } else if (shift === 'chieu') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'HCông - Phương';
                                }
                            } else if (position.id === 'noitru_t3_sang') {
                                // Nội trú T3 Sáng
                                if (shift === 'chan' && isEven) {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'NhungL - Trang (rv p. HCông) - Tư (care p. Vinh)';
                                } else if (shift === 'le' && !isEven) {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'SH - Hoa (care p. Giang)';
                                }
                            } else if (position.id === 'noitru_t3_chieu') {
                                // Nội trú T3 Chiều
                                if (shift === 'chan' && isEven) {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'NhungL - Lương - Bắc – Nhung B';
                                } else if (shift === 'le' && !isEven) {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Tùng - Khánh';
                                }
                            } else if (position.id === 'khamsom') {
                                // Khám sớm - lấy từ lịch khám sớm
                                doctorName = getDoctorFromSchedule(dateStr, 'khamsom') || lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Lên - Tài';
                            } else if (position.id === 'khamcaugiay') {
                                // Khám Cầu Giấy
                                doctorName = getDoctorFromSchedule(dateStr, 'khamcaugiay') || lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Xuân, Hồng';
                            } else if (position.id === 'hspk_t4') {
                                // HSPK+T4
                                if (shift === 'sang') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Khánh';
                                } else if (shift === 'chieu') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || '';
                                }
                            } else if (position.id === 'phongde') {
                                // Phòng đẻ
                                if (shift === 'sang') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Lương - Bắc - Phương';
                                } else if (shift === 'chieu') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Lên - Tư';
                                }
                            } else if (position.id === 'phumo_pk') {
                                // Phụ mổ PK
                                if (shift === 'sang') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Đại';
                                } else if (shift === 'chieu') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Trang';
                                }
                            } else if (position.id === 'kham') {
                                // Khám
                                if (shift === 'sang') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Dậu, HCông, Lên';
                                } else if (shift === 'chieu') {
                                    doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'SH, Trang, Hoa';
                                }
                            } else if (position.id === 'khamtrua') {
                                // Khám trưa
                                doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Trang';
                            } else if (position.id === 'lichnghi') {
                                // Lịch nghỉ - lấy từ quanlynghiphepData
                                doctorName = getDoctorsFromNghiPhep(dateStr, shift);
                                // Nếu không có dữ liệu từ quanlynghiphepData, lấy từ lichlamviecData (fallback)
                                if (!doctorName) {
                                    if (shift === 'c1') {
                                        doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Vinh, Đại(chiều), Giang, Hưng';
                                    } else if (shift === 'c2c3') {
                                        doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Kim, VCông, NA, Phương, NhungB(sáng)';
                                    }
                                }
                            } else if (position.id === 'truc_dn') {
                                // Trực D/N
                                doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || 'Tùng - Trang - Thúy';
                            } else {
                                // Mặc định lấy từ data đã lưu
                                doctorName = lichlamviecData[dateStr]?.[position.id]?.[shift] || '';
                            }
                            
                            // Tạo input hoặc hiển thị text
                            const disabledAttr = hasEditPermission ? '' : 'disabled';
                            const inputBackgroundColor = isHolidayLvCell ? '#d32f2f' : rowBackgroundColor;
                            const inputTextColor = isHolidayLvCell ? '#fff' : '#000';
                            const inputBorderColor = isHolidayLvCell ? 'rgba(255,255,255,0.5)' : (isLightColor ? '#ddd' : 'rgba(255, 255, 255, 0.3)');
                            const disabledStyle = hasEditPermission ? '' : 'background-color: ' + inputBackgroundColor + '; color: ' + inputTextColor + '; cursor: not-allowed; opacity: 1;';
                            
                            if (!isHolidayLvCell) {
                                td.style.background = rowBackgroundColor;
                                td.style.color = rowTextColor;
                            }
                            
                            td.innerHTML = `
                                <input type="text" 
                                       ${disabledAttr}
                                       value="${(doctorName || '').replace(/"/g, '&quot;')}" 
                                       placeholder="Nhập tên"
                                       onchange="updateLichlamviecData('${dateStr}', '${position.id}', '${shift}', this.value)"
                                       data-date="${dateStr}"
                                       data-position="${position.id}"
                                       data-shift="${shift}"
                                       style="width: 100%; padding: 6px; border: 1px solid ${inputBorderColor}; border-radius: 4px; font-size: 12px; font-family: inherit; text-align: center; background-color: ${inputBackgroundColor}; color: ${inputTextColor}; ${disabledStyle}">
                            `;
                            
                            row.appendChild(td);
                        });
                        
                        tbody.appendChild(row);
                    });
                });
                
                table.appendChild(tbody);
                tableContainer.appendChild(table);
                tableWrapper.appendChild(tableContainer);
                container.appendChild(tableWrapper);
            }
        }
        
        // Xuất PDF lịch làm việc cho một ngày cụ thể
        function exportLichlamviecPDF(dateStr, dayName, dateDisplay) {
            try {
                // Tạo một bảng tạm thời chỉ chứa dữ liệu của ngày này
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '0';
                tempDiv.style.top = '0';
                tempDiv.style.width = '210mm';
                tempDiv.style.padding = '20px';
                tempDiv.style.background = 'white';
                tempDiv.style.zIndex = '9999';
                tempDiv.style.visibility = 'hidden';
                document.body.appendChild(tempDiv);
                
                // Tiêu đề
                const title = document.createElement('h2');
                title.textContent = `Lịch làm việc - ${dayName} ${dateDisplay}`;
                title.style.textAlign = 'center';
                title.style.marginBottom = '20px';
                title.style.color = '#333';
                title.style.fontSize = '18px';
                title.style.fontWeight = 'bold';
                tempDiv.appendChild(title);
                
                // Tạo bảng
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.border = '1px solid #000';
                table.style.fontSize = '11px';
                table.style.fontFamily = 'Arial, sans-serif';
                
                // Header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headerRow.style.background = '#FFB6C1';
                headerRow.style.color = '#000';
                headerRow.style.fontWeight = 'bold';
                
                const th1 = document.createElement('th');
                th1.textContent = 'Vị trí làm việc';
                th1.style.padding = '10px';
                th1.style.border = '1px solid #000';
                th1.style.textAlign = 'left';
                th1.style.width = '200px';
                headerRow.appendChild(th1);
                
                const th2 = document.createElement('th');
                th2.textContent = 'Buổi';
                th2.style.padding = '10px';
                th2.style.border = '1px solid #000';
                th2.style.textAlign = 'center';
                th2.style.width = '100px';
                headerRow.appendChild(th2);
                
                const th3 = document.createElement('th');
                th3.textContent = `${dayName} ${dateDisplay}`;
                th3.style.padding = '10px';
                th3.style.border = '1px solid #000';
                th3.style.textAlign = 'center';
                headerRow.appendChild(th3);
                
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Body
                const tbody = document.createElement('tbody');
                const isEven = isEvenDay(dateStr);
                
                workPositions.forEach(position => {
                    position.shifts.forEach((shift, shiftIndex) => {
                        const row = document.createElement('tr');
                        const rowBackgroundColor = getPositionColor(position.id);
                        
                        // cộtVị trí làm việc
                        const td1 = document.createElement('td');
                        if (shiftIndex === 0) {
                            td1.textContent = position.name;
                            td1.rowSpan = position.shifts.length;
                            td1.style.padding = '10px';
                            td1.style.border = '1px solid #000';
                            td1.style.background = '#ff0000'; // Nền màu đỏ
                            td1.style.color = '#ffffff'; // Chữ màu trắng
                            td1.style.fontWeight = 'bold';
                            td1.style.verticalAlign = 'middle';
                        }
                        if (shiftIndex === 0) {
                            row.appendChild(td1);
                        }
                        
                        // cộtBuổi
                        const td2 = document.createElement('td');
                        let shiftName = '';
                        if (shift === 'sang') shiftName = 'Sáng';
                        else if (shift === 'chieu') shiftName = 'Chiều';
                        else if (shift === 'chan') shiftName = 'Chẵn';
                        else if (shift === 'le') shiftName = 'Lẻ';
                        else if (shift === 'c1') shiftName = 'C1';
                        else if (shift === 'c2c3') shiftName = 'C2+C3';
                        else shiftName = '';
                        td2.textContent = shiftName;
                        td2.style.padding = '8px';
                        td2.style.border = '1px solid #000';
                        td2.style.background = rowBackgroundColor;
                        td2.style.color = '#000';
                        td2.style.textAlign = 'center';
                        row.appendChild(td2);
                        
                        // cộtngày
                        const td3 = document.createElement('td');
                        td3.style.padding = '8px';
                        td3.style.border = '1px solid #000';
                        td3.style.background = rowBackgroundColor;
                        td3.style.color = '#000';
                        td3.style.textAlign = 'center';
                        td3.style.wordWrap = 'break-word';
                        
                        let doctorName = '';
                        
                        // Lấy dữ liệu - sử dụng cùng logic như render table
                        if (position.linkFrom === 'tieuphau') {
                            doctorName = getDoctorFromSchedule(dateStr, 'tieuphau') || '-';
                        } else if (position.id === 'tieuphau') {
                            if (shift === 'sang') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Tùng';
                            } else if (shift === 'chieu') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'HCông - Phương';
                            }
                        } else if (position.id === 'noitru_t3_sang') {
                            if (shift === 'chan' && isEven) {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'NhungL - Trang (rv p. HCông) - Tư (care p. Vinh)';
                            } else if (shift === 'le' && !isEven) {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'SH - Hoa (care p. Giang)';
                            }
                        } else if (position.id === 'noitru_t3_chieu') {
                            if (shift === 'chan' && isEven) {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'NhungL - Lương - Bắc – Nhung B';
                            } else if (shift === 'le' && !isEven) {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Tùng - Khánh';
                            }
                        } else if (position.id === 'khamsom') {
                            doctorName = getDoctorFromSchedule(dateStr, 'khamsom') || (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Lên - Tài';
                        } else if (position.id === 'khamcaugiay') {
                            doctorName = getDoctorFromSchedule(dateStr, 'khamcaugiay') || (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Xuân, Hồng';
                        } else if (position.id === 'hspk_t4') {
                            if (shift === 'sang') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Khánh';
                            } else if (shift === 'chieu') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || '';
                            }
                        } else if (position.id === 'phongde') {
                            if (shift === 'sang') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Lương - Bắc - Phương';
                            } else if (shift === 'chieu') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Lên - Tư';
                            }
                        } else if (position.id === 'phumo_pk') {
                            if (shift === 'sang') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Đại';
                            } else if (shift === 'chieu') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Trang';
                            }
                        } else if (position.id === 'kham') {
                            if (shift === 'sang') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Dậu, HCông, Lên';
                            } else if (shift === 'chieu') {
                                doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'SH, Trang, Hoa';
                            }
                        } else if (position.id === 'khamtrua') {
                            doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Trang';
                        } else if (position.id === 'lichnghi') {
                            // Lịch nghỉ - lấy từ quanlynghiphepData
                            doctorName = getDoctorsFromNghiPhep(dateStr, shift);
                            // Nếu không có dữ liệu từ quanlynghiphepData, lấy từ lichlamviecData (fallback)
                            if (!doctorName) {
                                if (shift === 'c1') {
                                    doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Vinh, Đại(chiều), Giang, Hưng';
                                } else if (shift === 'c2c3') {
                                    doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Kim, VCông, NA, Phương, NhungB(sáng)';
                                }
                            }
                        } else if (position.id === 'truc_dn') {
                            doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || 'Tùng - Trang - Thúy';
                        } else {
                            doctorName = (lichlamviecData[dateStr] && lichlamviecData[dateStr][position.id] && lichlamviecData[dateStr][position.id][shift]) || '';
                        }
                        
                        td3.textContent = doctorName || '';
                        row.appendChild(td3);
                        tbody.appendChild(row);
                    });
                });
                
                table.appendChild(tbody);
                tempDiv.appendChild(table);
                
                // Force reflow để đảm bảo DOM đã render
                tempDiv.offsetHeight;
                
                // Đợi một chút để đảm bảo DOM đã render xong
                setTimeout(() => {
                    // Xuất PDF
                    const opt = {
                        margin: [10, 10, 10, 10],
                        filename: `Lich_lam_viec_${dateStr}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { 
                            scale: 2, 
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff'
                        },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    
                    html2pdf().set(opt).from(tempDiv).save().then(() => {
                        if (tempDiv.parentNode) {
                            document.body.removeChild(tempDiv);
                        }
                    }).catch(err => {
                        console.error('Lỗi xuất PDF:', err);
                        alert('Có lỗi khi xuất PDF. Vui lòng thử lại.');
                        if (tempDiv.parentNode) {
                            document.body.removeChild(tempDiv);
                        }
                    });
                }, 100);
            } catch (error) {
                console.error('Lỗi khi tạo PDF:', error);
                alert('Có lỗi khi tạo PDF. Vui lòng thử lại.');
            }
        }
        
        // Update data
        function updateLichlamviecData(dateStr, positionId, shift, value) {
            if (!hasPermission('lichlamviec')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                return;
            }
            
            // Nếu là dòng "Lịch nghỉ", cập nhật vào quanlynghiphepData
            if (positionId === 'lichnghi') {
                if (value && value.trim()) {
                    updateNghiPhepFromString(dateStr, shift, value.trim());
                } else {
                    // Xóa dữ liệu nghỉ phép
                    if (quanlynghiphepData[dateStr]) {
                        if (shift === 'c1') {
                            quanlynghiphepData[dateStr].c1.doctors = [];
                        } else if (shift === 'c2c3') {
                            quanlynghiphepData[dateStr].c2.doctors = [];
                            quanlynghiphepData[dateStr].c3.doctors = [];
                        }
                        StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
                        if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                    }
                }
                // Vẫn lưu vào lichlamviecData để backup
                if (!lichlamviecData[dateStr]) {
                    lichlamviecData[dateStr] = {};
                }
                if (!lichlamviecData[dateStr][positionId]) {
                    lichlamviecData[dateStr][positionId] = {};
                }
                if (value && value.trim()) {
                    lichlamviecData[dateStr][positionId][shift] = value.trim();
                } else {
                    delete lichlamviecData[dateStr][positionId][shift];
                }
                saveLichlamviecData();
                // Render lại bảng để cập nhật hiển thị
                renderLichlamviecTable();
                return;
            }
            
            // Các dòng khác giữ nguyên logic cũ
            if (!lichlamviecData[dateStr]) {
                lichlamviecData[dateStr] = {};
            }
            if (!lichlamviecData[dateStr][positionId]) {
                lichlamviecData[dateStr][positionId] = {};
            }
            
            if (value && value.trim()) {
                lichlamviecData[dateStr][positionId][shift] = value.trim();
            } else {
                delete lichlamviecData[dateStr][positionId][shift];
                if (Object.keys(lichlamviecData[dateStr][positionId]).length === 0) {
                    delete lichlamviecData[dateStr][positionId];
                }
                if (Object.keys(lichlamviecData[dateStr]).length === 0) {
                    delete lichlamviecData[dateStr];
                }
            }
            
            saveLichlamviecData();
        }
        
        // Save data to localStorage
        function saveLichlamviecData() {
            StorageUtil.saveJson(STORAGE_KEYS.lichlamviecData, lichlamviecData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Lịch Phụ Mổ Functions ==========
        
        function getPhumoDoctorListForInput() {
            return Array.isArray(phumoDoctorList) ? phumoDoctorList : [];
        }

        function openPhumoDoctorListModal() {
            if (!hasPermission('phumo')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            let modal = document.getElementById('phumoDoctorListModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'phumoDoctorListModal';
                modal.className = 'login-modal';
                modal.innerHTML = `
                    <div class="login-box" style="max-width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h2 style="margin: 0;">📋 Danh sách bác sĩ phụ mổ</h2>
                            <button type="button" class="login-modal-close" onclick="closePhumoDoctorListModal()" aria-label="Đóng">×</button>
                        </div>
                        <p style="font-size: 13px; color: #666; margin-bottom: 15px;">Tick chọn các bác sĩ có thể phụ mổ. Ô nhập trong bảng lịch chỉ hiển thị danh sách này để chọn.</p>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button type="button" onclick="phumoSelectAllDoctors(true)" style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Chọn tất cả</button>
                            <button type="button" onclick="phumoSelectAllDoctors(false)" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Bỏ chọn tất cả</button>
                        </div>
                        <div id="phumoDoctorListContainer" style="flex: 1; overflow-y: auto; max-height: 400px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #f8f9fa;"></div>
                        <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end;">
                            <button type="button" onclick="closePhumoDoctorListModal()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Hủy</button>
                            <button type="button" onclick="savePhumoDoctorListFromModal()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Lưu</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            const container = document.getElementById('phumoDoctorListContainer');
            if (!container) return;
            const allDoctors = typeof getAllDoctorsForLamviechangngay === 'function' ? getAllDoctorsForLamviechangngay() : [];
            const selectedSet = new Set((phumoDoctorList || []).map(n => normalizeKey(n)));
            container.innerHTML = '';
            allDoctors.forEach(doc => {
                const displayName = doc.displayName || doc.name || '';
                const key = normalizeKey(displayName);
                const checked = selectedSet.has(key) || (phumoDoctorList.length === 0 && selectedSet.size === 0);
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px;';
                label.innerHTML = `
                    <input type="checkbox" data-doctor-name="${displayName.replace(/"/g, '&quot;')}" ${checked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 14px;">${displayName}</span>
                `;
                container.appendChild(label);
            });
            modal.classList.add('active');
        }

        function phumoSelectAllDoctors(checked) {
            document.querySelectorAll('#phumoDoctorListContainer input[type="checkbox"]').forEach(cb => cb.checked = checked);
        }

        function savePhumoDoctorListFromModal() {
            const checkboxes = document.querySelectorAll('#phumoDoctorListContainer input[type="checkbox"]:checked');
            phumoDoctorList = Array.from(checkboxes).map(cb => cb.getAttribute('data-doctor-name'));
            StorageUtil.saveJson(STORAGE_KEYS.phumoDoctorList, phumoDoctorList);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
            closePhumoDoctorListModal();
            renderPhumoTable();
            alert('✅ Đã lưu danh sách bác sĩ phụ mổ.');
        }

        function closePhumoDoctorListModal() {
            const modal = document.getElementById('phumoDoctorListModal');
            if (modal) modal.classList.remove('active');
        }
        
        // Initialize Lịch phụ mổ table
        function initPhumoTable() {
            renderPhumoTable();
            const notesTextarea = document.getElementById('phumoNotes');
            if (notesTextarea) {
                notesTextarea.value = phumoData.notes || '';
            }
        }
        
        // Render Lịch phụ mổ table - mỗi ngày có thể có nhiều bác sĩ phụ mổ
        function renderPhumoTable() {
            const tbody = document.getElementById('phumoTableBody');
            if (!tbody) return;

            if (!phumoData.rows || phumoData.rows.length === 0) {
                phumoData.rows = [{ thu2: '', thu3: '', thu4: '', thu5: '', thu6: '', thu7: '' }];
            }

            const doctorOptions = getPhumoDoctorListForInput();
            let datalistEl = document.getElementById('phumoDoctorsDatalist');
            if (!datalistEl) {
                datalistEl = document.createElement('datalist');
                datalistEl.id = 'phumoDoctorsDatalist';
                document.body.appendChild(datalistEl);
            }
            datalistEl.innerHTML = doctorOptions.map(n => `<option value="${(n || '').replace(/"/g, '&quot;')}">`).join('');

            tbody.innerHTML = '';
            const hasEditPermission = hasPermission('phumo');
            const disabledAttr = hasEditPermission ? '' : 'disabled';
            const disabledStyle = hasEditPermission ? '' : 'background-color: #ffffff; color: #333333; cursor: not-allowed; opacity: 1;';
            
            const days = [
                { key: 'thu2', label: 'Thứ 2' },
                { key: 'thu3', label: 'Thứ 3' },
                { key: 'thu4', label: 'Thứ 4' },
                { key: 'thu5', label: 'Thứ 5' },
                { key: 'thu6', label: 'Thứ 6' },
                { key: 'thu7', label: 'Thứ 7' }
            ];
            
            phumoData.rows.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
            days.forEach(day => {
                const td = document.createElement('td');
                td.style.padding = '12px';
                td.style.border = '1px solid #ddd';
                td.style.textAlign = 'center';
                td.innerHTML = `
                    <input type="text" 
                               list="phumoDoctorsDatalist"
                           ${disabledAttr}
                               value="${(row[day.key] || '').replace(/"/g, '&quot;')}" 
                               placeholder="Chọn từ danh sách"
                               onchange="updatePhumoData(${rowIndex}, '${day.key}', this.value)"
                               data-row="${rowIndex}"
                               data-day="${day.key}"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; text-align: center; font-family: inherit; ${disabledStyle}">
                `;
                tr.appendChild(td);
            });
                const tdAction = document.createElement('td');
                tdAction.style.padding = '8px';
                tdAction.style.border = '1px solid #ddd';
                tdAction.style.textAlign = 'center';
                tdAction.style.width = '100px';
                const deleteBtn = hasEditPermission ? `<button class="delete-btn" onclick="deletePhumoRow(${rowIndex})" style="padding: 6px 12px; font-size: 12px;">🗑️ Xóa</button>` : '';
                tdAction.innerHTML = deleteBtn;
                tr.appendChild(tdAction);
            tbody.appendChild(tr);
            });
        }

        function addPhumoRow() {
            if (!hasPermission('phumo')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            phumoData.rows.push({ thu2: '', thu3: '', thu4: '', thu5: '', thu6: '', thu7: '' });
            savePhumoData();
            renderPhumoTable();
        }

        function deletePhumoRow(rowIndex) {
            if (!hasPermission('phumo')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin.');
                return;
            }
            if (phumoData.rows.length <= 1) {
                alert('Cần ít nhất 1 dòng. Có thể xóa nội dung thay vì xóa dòng.');
                return;
            }
            phumoData.rows.splice(rowIndex, 1);
            savePhumoData();
            renderPhumoTable();
        }
        
        // Update data
        function updatePhumoData(rowIndex, dayKey, value) {
            if (!hasPermission('phumo')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                const input = document.querySelector(`#phumoTable input[data-row="${rowIndex}"][data-day="${dayKey}"]`);
                if (input) input.value = (phumoData.rows[rowIndex] || {})[dayKey] || '';
                return;
            }
            if (!phumoData.rows[rowIndex]) phumoData.rows[rowIndex] = { thu2: '', thu3: '', thu4: '', thu5: '', thu6: '', thu7: '' };
            phumoData.rows[rowIndex][dayKey] = value;
            savePhumoData();
        }
        
        // Update notes
        function updatePhumoNotes(value) {
            if (!hasPermission('phumo')) {
                alert('Bạn không có quyền chỉnh sửa. Vui lòng liên hệ admin để được cấp quyền.');
                // Restore previous value
                const textarea = document.getElementById('phumoNotes');
                if (textarea) {
                    textarea.value = phumoData.notes || '';
                }
                return;
            }
            phumoData.notes = value;
            savePhumoData();
        }
        
        // Save data to localStorage
        function savePhumoData() {
            StorageUtil.saveJson(STORAGE_KEYS.phumoData, phumoData);
            if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
        }

        // ========== Backup & Restore Functions ==========
        
        // Export all data to JSON file
        function exportAllData() {
            const allData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                doctors: {
                    lanhdao: doctors.lanhdao || [],
                    cot1: doctors.cot1,
                    cot2: doctors.cot2,
                    cot3: doctors.cot3,
                    partime: doctors.partime,
                    khac: doctors.khac
                },
                accounts: accounts,
                passwordRequests: passwordRequests,
                leaveSubmissions: submissions,
                cvcot1Data: cvcot1Data,
                cvcot23Data: cvcot23Data,
                khamhotropkData: khamhotropkData,
                khamsomData: khamsomData,
                khamcaugiayData: khamcaugiayData,
                khamcaugiayDoctorList: khamcaugiayDoctorList,
                khamcaugiayBaoHiem: khamcaugiayBaoHiem,
                khamcaugiayRooms: khamcaugiayRooms,
                khamcaugiay20hData: khamcaugiay20hData,
                khamlongbienData: khamlongbienData,
                khamsanvipData: khamsanvipData,
                sieuamvipData: sieuamvipData,
                tructruaData: tructruaData,
                tieuphauData: tieuphauData,
                livetreamData: livetreamData,
                livetreamDoctorList: livetreamDoctorList,
                tang4Data: tang4Data,
                tang4Notes: tang4Notes,
                hoichancot1ScheduleData: hoichancot1ScheduleData,
                phumoData: phumoData,
                phumoDoctorList: phumoDoctorList,
                tructhuongtruData: tructhuongtruData,
                tructhuongtruDoctorList: tructhuongtruDoctorList,
                lichTrucData: lichTrucData,
                lamviechangngayData: lamviechangngayData,
                lamviechangngayDoctorList: lamviechangngayDoctorList,
                lamviechangngayRooms: lamviechangngayRooms,
                lamviechangngayRoomsCauGiay: lamviechangngayRoomsCauGiay,
                lamviechangngayRoomsLongBien: lamviechangngayRoomsLongBien,
                lichlamviecData: lichlamviecData,
                quanlynghiphepData: quanlynghiphepData,
                maxCountByWeekday: maxCountByWeekday,
                fixedScheduleData: fixedScheduleData,
                holidayMarkedDates: holidayMarkedDates,
                holidayLabels: holidayLabels,
                permissions: permissions,
                permissionTabs: permissionTabs,
                quydinhData: quydinhData
            };
            
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert('✅ Đã xuất dữ liệu thành công!');
        }

        // Import data from JSON file
        function importAllData(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (!confirm('⚠️ CẢNH BÁO: Nhập dữ liệu sẽ thay thế TOÀN BỘ dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
                event.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!importedData.doctors || !importedData.accounts) {
                        alert('❌ File không đúng định dạng!');
                        return;
                    }
                    
                    // Import data
                    if (importedData.doctors) {
                        doctors.lanhdao = importedData.doctors.lanhdao || [];
                        doctors.cot1 = importedData.doctors.cot1 || [];
                        doctors.cot2 = importedData.doctors.cot2 || [];
                        doctors.cot3 = importedData.doctors.cot3 || [];
                        doctors.partime = importedData.doctors.partime || [];
                        doctors.khac = importedData.doctors.khac || [];
                        
                        // Save to localStorage
                        localStorage.setItem('doctorsLanhdao', JSON.stringify(doctors.lanhdao));
                        localStorage.setItem('doctorscot1', JSON.stringify(doctors.cot1));
                        localStorage.setItem('doctorscot2', JSON.stringify(doctors.cot2));
                        localStorage.setItem('doctorscot3', JSON.stringify(doctors.cot3));
                        localStorage.setItem('doctorsPartime', JSON.stringify(doctors.partime));
                        localStorage.setItem('doctorsKhac', JSON.stringify(doctors.khac));
                    }
                    
                    if (importedData.accounts) {
                        accounts = importedData.accounts;
                        StorageUtil.saveJson(STORAGE_KEYS.accounts, accounts);
                    }
                    
                    if (importedData.passwordRequests) {
                        passwordRequests = importedData.passwordRequests;
                        StorageUtil.saveJson(STORAGE_KEYS.passwordRequests, passwordRequests);
                    }
                    
                    if (importedData.leaveSubmissions) {
                        submissions = importedData.leaveSubmissions;
                        StorageUtil.saveJson(STORAGE_KEYS.leaveSubmissions, submissions);
                    }
                    
                    if (importedData.cvcot1Data) {
                        cvcot1Data = importedData.cvcot1Data;
                        localStorage.setItem('cvcot1Data', JSON.stringify(cvcot1Data));
                    }
                    
                    if (importedData.cvcot23Data) {
                        cvcot23Data = importedData.cvcot23Data;
                        localStorage.setItem('cvcot23Data', JSON.stringify(cvcot23Data));
                    }
                    
                    if (importedData.khamhotropkData) {
                        khamhotropkData = importedData.khamhotropkData;
                        localStorage.setItem('khamhotropkData', JSON.stringify(khamhotropkData));
                    }
                    
                    if (importedData.khamsomData) {
                        khamsomData = importedData.khamsomData;
                        localStorage.setItem('khamsomData', JSON.stringify(khamsomData));
                    }
                    if (importedData.khamcaugiayData) {
                        khamcaugiayData = importedData.khamcaugiayData;
                        StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayData, khamcaugiayData);
                    }
                    if (importedData.khamcaugiayDoctorList) {
                        khamcaugiayDoctorList = importedData.khamcaugiayDoctorList;
                        StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayDoctorList, khamcaugiayDoctorList);
                    }
                    if (importedData.khamcaugiayBaoHiem) {
                        khamcaugiayBaoHiem = importedData.khamcaugiayBaoHiem;
                        StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayBaoHiem, khamcaugiayBaoHiem);
                    }
                    if (importedData.khamcaugiayRooms) {
                        khamcaugiayRooms = importedData.khamcaugiayRooms;
                        StorageUtil.saveJson(STORAGE_KEYS.khamcaugiayRooms, khamcaugiayRooms);
                    }
                    if (importedData.khamcaugiay20hData) {
                        khamcaugiay20hData = importedData.khamcaugiay20hData;
                        StorageUtil.saveJson(STORAGE_KEYS.khamcaugiay20hData, khamcaugiay20hData);
                    }
                    if (importedData.khamlongbienData) {
                        khamlongbienData = importedData.khamlongbienData;
                        StorageUtil.saveJson(STORAGE_KEYS.khamlongbienData, khamlongbienData);
                    }
                    if (importedData.khamsanvipData) {
                        khamsanvipData = importedData.khamsanvipData;
                        localStorage.setItem('khamsanvipData', JSON.stringify(khamsanvipData));
                    }
                    if (importedData.sieuamvipData) {
                        sieuamvipData = importedData.sieuamvipData;
                        localStorage.setItem('sieuamvipData', JSON.stringify(sieuamvipData));
                    }
                    
                    if (importedData.tructruaData) {
                        tructruaData = importedData.tructruaData;
                        localStorage.setItem('tructruaData', JSON.stringify(tructruaData));
                    }
                    
                    if (importedData.tieuphauData) {
                        tieuphauData = importedData.tieuphauData;
                        localStorage.setItem('tieuphauData', JSON.stringify(tieuphauData));
                    }
                    
                    if (importedData.livetreamData) {
                        livetreamData = importedData.livetreamData;
                        localStorage.setItem('livetreamData', JSON.stringify(livetreamData));
                    }
                    if (importedData.livetreamDoctorList) {
                        livetreamDoctorList = importedData.livetreamDoctorList;
                        StorageUtil.saveJson(STORAGE_KEYS.livetreamDoctorList, livetreamDoctorList);
                    }
                    
                    if (importedData.tang4Data) {
                        tang4Data = importedData.tang4Data;
                        localStorage.setItem('tang4Data', JSON.stringify(tang4Data));
                    }
                    
                    if (importedData.tang4Notes !== undefined) {
                        tang4Notes = importedData.tang4Notes || '';
                        localStorage.setItem('tang4Notes', tang4Notes);
                        // Update textarea if it exists
                        const notesTextarea = document.getElementById('tang4Notes');
                        if (notesTextarea) {
                            notesTextarea.value = tang4Notes;
                        }
                    }
                    
                    if (importedData.hoichancot1ScheduleData) {
                        hoichancot1ScheduleData = importedData.hoichancot1ScheduleData;
                        localStorage.setItem('hoichancot1ScheduleData', JSON.stringify(hoichancot1ScheduleData));
                    }
                    
                    if (importedData.phumoData) {
                        phumoData = normalizePhumoData(importedData.phumoData);
                        StorageUtil.saveJson(STORAGE_KEYS.phumoData, phumoData);
                    }
                    if (importedData.phumoDoctorList) {
                        phumoDoctorList = importedData.phumoDoctorList;
                        StorageUtil.saveJson(STORAGE_KEYS.phumoDoctorList, phumoDoctorList);
                    }
                    
                    if (importedData.tructhuongtruData) {
                        tructhuongtruData = importedData.tructhuongtruData;
                        StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruData, tructhuongtruData);
                    }
                    if (importedData.tructhuongtruDoctorList) {
                        tructhuongtruDoctorList = importedData.tructhuongtruDoctorList;
                        StorageUtil.saveJson(STORAGE_KEYS.tructhuongtruDoctorList, tructhuongtruDoctorList);
                    }
                    if (importedData.lichTrucData) {
                        lichTrucData = importedData.lichTrucData;
                        StorageUtil.saveJson(STORAGE_KEYS.lichTrucData, lichTrucData);
                    }
                    
                    if (importedData.lamviechangngayData) {
                        lamviechangngayData = importedData.lamviechangngayData;
                        localStorage.setItem('lamviechangngayData', JSON.stringify(lamviechangngayData));
                    }
                    if (importedData.lamviechangngayDoctorList) {
                        lamviechangngayDoctorList = importedData.lamviechangngayDoctorList;
                        StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayDoctorList, lamviechangngayDoctorList);
                    }
                    if (importedData.lamviechangngayRooms) {
                        lamviechangngayRooms = importedData.lamviechangngayRooms;
                        StorageUtil.saveJson(STORAGE_KEYS.lamviechangngayRooms, lamviechangngayRooms);
                    }
                    
                    if (importedData.lichlamviecData) {
                        lichlamviecData = importedData.lichlamviecData;
                        StorageUtil.saveJson(STORAGE_KEYS.lichlamviecData, lichlamviecData);
                    }
                    
                    if (importedData.quanlynghiphepData) {
                        quanlynghiphepData = importedData.quanlynghiphepData;
                        StorageUtil.saveJson(STORAGE_KEYS.quanlynghiphepData, quanlynghiphepData);
                    }
                    
                    if (importedData.permissions) {
                        permissions = importedData.permissions;
                        StorageUtil.saveJson(STORAGE_KEYS.permissions, permissions);
                    }
                    if (importedData.maxCountByWeekday) {
                        maxCountByWeekday = importedData.maxCountByWeekday;
                        StorageUtil.saveJson(STORAGE_KEYS.maxCountByWeekday, maxCountByWeekday);
                    }
                    if (importedData.fixedScheduleData) {
                        fixedScheduleData = importedData.fixedScheduleData;
                        StorageUtil.saveJson(STORAGE_KEYS.fixedScheduleData, fixedScheduleData);
                    }
                    if (importedData.holidayMarkedDates && Array.isArray(importedData.holidayMarkedDates)) {
                        holidayMarkedDates = importedData.holidayMarkedDates;
                        StorageUtil.saveJson(STORAGE_KEYS.holidayMarkedDates, holidayMarkedDates);
                    }
                    if (importedData.holidayLabels && typeof importedData.holidayLabels === 'object') {
                        holidayLabels = importedData.holidayLabels;
                        StorageUtil.saveJson(STORAGE_KEYS.holidayLabels, holidayLabels);
                    }
                    if (importedData.permissionTabs) {
                        permissionTabs = importedData.permissionTabs;
                        StorageUtil.saveJson(STORAGE_KEYS.permissionTabs, permissionTabs);
                    }
                    if (importedData.quydinhData) {
                        quydinhData = importedData.quydinhData;
                        StorageUtil.saveJson(STORAGE_KEYS.quydinhData, quydinhData);
                    }
                    if (typeof syncToBackend === 'function' && USE_DATABASE_BACKEND) syncToBackend();
                    alert('✅ Đã nhập dữ liệu thành công! Trang sẽ được tải lại.');
                    location.reload();
                } catch (error) {
                    alert('❌ Lỗi khi đọc file: ' + error.message);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // Clear all data (with confirmation)
        function openClearDataPasswordModal() {
            if (!currentUser) {
                alert('Vui lòng đăng nhập để thực hiện thao tác này.');
                return;
            }
            ensureClearDataPasswordModalInDom();
            const modal = document.getElementById('clearDataPasswordModal');
            if (modal) {
                document.getElementById('clearDataPasswordInput').value = '';
                document.getElementById('clearDataPasswordError').style.display = 'none';
                modal.classList.add('active');
            }
        }
        function closeClearDataPasswordModal() {
            const modal = document.getElementById('clearDataPasswordModal');
            if (modal) modal.classList.remove('active');
        }
        function ensureClearDataPasswordModalInDom() {
            if (document.getElementById('clearDataPasswordModal')) return;
            const modal = document.createElement('div');
            modal.id = 'clearDataPasswordModal';
            modal.className = 'login-modal';
            modal.innerHTML = `
                <div class="login-box" style="max-width: 420px;">
                    <h2>⚠️ Xác Nhận Xóa Dữ Liệu</h2>
                    <p style="font-size: 14px; color: #e74c3c; margin-bottom: 15px; font-weight: 600;">
                        ⚠️ CẢNH BÁO: Hành động này sẽ XÓA TẤT CẢ dữ liệu và không thể hoàn tác!
                    </p>
                    <div id="clearDataPasswordError" class="error-message" style="display: none;"></div>
                    <form onsubmit="confirmClearData(event)">
                        <div class="form-group">
                            <label for="clearDataPasswordInput">Nhập mật khẩu để xác nhận <span class="required">*</span></label>
                            <div class="password-wrapper">
                                <input type="password" id="clearDataPasswordInput" required autocomplete="off">
                                <button type="button" class="password-toggle" onclick="togglePassword('clearDataPasswordInput', this)" aria-label="Hiện mật khẩu">👁️</button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="submit-btn" onclick="closeClearDataPasswordModal()" style="background: #95a5a6; flex: 1;">Hủy</button>
                            <button type="submit" class="submit-btn" style="background: #e74c3c; flex: 1;">⚠️ Xóa Tất Cả</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }
        function confirmClearData(event) {
            event.preventDefault();
            const password = document.getElementById('clearDataPasswordInput').value;
            const errorMsg = document.getElementById('clearDataPasswordError');
            errorMsg.style.display = 'none';
            
            if (!currentUser) {
                errorMsg.textContent = '❌ Vui lòng đăng nhập để thực hiện thao tác này.';
                errorMsg.style.display = 'block';
                return;
            }
            
            const accKey = currentUser && currentUser.key ? currentUser.key : normalizeKey(currentUser && currentUser.username);
            if (!accounts[accKey] || accounts[accKey].password !== password) {
                errorMsg.textContent = '❌ Mật khẩu không đúng! Vui lòng thử lại.';
                errorMsg.style.display = 'block';
                return;
            }
            
            // Xác nhận lần cuối
            if (!confirm('⚠️ XÁC NHẬN LẦN CUỐI: Bạn thực sự muốn xóa TẤT CẢ dữ liệu?')) {
                return;
            }
            
            closeClearDataPasswordModal();
            clearAllData();
        }
        window.openClearDataPasswordModal = openClearDataPasswordModal;
        window.closeClearDataPasswordModal = closeClearDataPasswordModal;
        window.confirmClearData = confirmClearData;
        function clearAllData() {
            // Clear all localStorage
            localStorage.removeItem('doctorsLanhdao');
            localStorage.removeItem('doctorscot1');
            localStorage.removeItem('doctorscot2');
            localStorage.removeItem('doctorscot3');
            localStorage.removeItem('doctorsPartime');
            localStorage.removeItem('doctorsKhac');
            localStorage.removeItem('accounts');
            localStorage.removeItem('passwordRequests');
            localStorage.removeItem('leaveSubmissions');
            localStorage.removeItem('cvcot1Data');
            localStorage.removeItem('cvcot23Data');
            localStorage.removeItem('khamhotropkData');
            localStorage.removeItem('khamsomData');
            StorageUtil.remove(STORAGE_KEYS.khamcaugiay20hData);
            localStorage.removeItem('khamsanvipData');
            localStorage.removeItem('sieuamvipData');
            localStorage.removeItem('tructruaData');
            localStorage.removeItem('tieuphauData');
            localStorage.removeItem('livetreamData');
            localStorage.removeItem('livetreamDoctorList');
            localStorage.removeItem('tang4Data');
            localStorage.removeItem('hoichancot1ScheduleData');
            localStorage.removeItem('phumoData');
            localStorage.removeItem('phumoDoctorList');
            localStorage.removeItem('tructhuongtruData');
            localStorage.removeItem('tructhuongtruDoctorList');
            localStorage.removeItem('lamviechangngayData');
            localStorage.removeItem('lamviechangngayDoctorList');
            localStorage.removeItem('lamviechangngayRooms');
            localStorage.removeItem('lichlamviecData');
            localStorage.removeItem('quanlynghiphepData');
            localStorage.removeItem('permissions');
            localStorage.removeItem('currentUser');
            
            alert('✅ Đã xóa tất cả dữ liệu! Trang sẽ được tải lại.');
            location.reload();
        }

        // ========== Back to Top Button ==========
        // Hiển thị/ẩn nút khi scroll
        window.addEventListener('scroll', function() {
            const backToTopBtn = document.getElementById('backToTopBtn');
            const backToBottomBtn = document.getElementById('backToBottomBtn');
            if (backToTopBtn) {
                if (window.pageYOffset > 300) {
                    backToTopBtn.classList.add('show');
                } else {
                    backToTopBtn.classList.remove('show');
                }
            }
            if (backToBottomBtn) {
                // Hiển thị nút đi đến cuối trang khi không ở cuối trang
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const isAtBottom = scrollTop + windowHeight >= documentHeight - 10;
                
                if (scrollTop > 300 && !isAtBottom) {
                    backToBottomBtn.classList.add('show');
                } else {
                    backToBottomBtn.classList.remove('show');
                }
            }
        });

        // Scroll về đầu trang
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Scroll đến cuối trang
        function scrollToBottom() {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }
    