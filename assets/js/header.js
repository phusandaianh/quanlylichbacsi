/**
 * Header chung cho các trang con (pages/*.html).
 * Chèn header vào #header-placeholder và đánh dấu tab hiện tại theo data-current-tab trên body.
 */
(function () {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    var currentTab = (document.body && document.body.getAttribute('data-current-tab')) || '';

    var tabs = [
        { id: '', label: '🏠', href: '/', adminOnly: false },
        { id: 'lanhdao', label: 'Lãnh đạo', href: 'lanhdao.html', adminOnly: true },
        { id: 'cot1', label: 'Cột 1', href: 'cot1.html', adminOnly: true },
        { id: 'cot2', label: 'Cột 2', href: 'cot2.html', adminOnly: true },
        { id: 'cot3', label: 'Cột 3', href: 'cot3.html', adminOnly: true },
        { id: 'partime', label: 'Partime', href: 'partime.html', adminOnly: true },
        { id: 'khac', label: 'Bác Sĩ Khác', href: 'khac.html', adminOnly: true },
        { id: 'quanlytaikhoan', label: 'Quản Lý Tài Khoản', href: 'quanlytaikhoan.html', adminOnly: true },
        { id: 'quanlynghiphep', label: 'Quản Lý Nghỉ Phép', href: 'quanlynghiphep.html', adminOnly: false },
        { id: 'lichnghiphep', label: 'Lịch Nghỉ Phép', href: 'lichnghiphep.html', adminOnly: false },
        { id: 'ngaycong', label: 'Ngày Công Làm Việc', href: 'ngaycong.html', adminOnly: false },
        { id: 'khamcaugiay', label: 'Lịch khám Cầu Giấy', href: 'khamcaugiay.html', adminOnly: true },
        { id: 'khamcaugiay20h', label: 'Lịch khám Cầu Giấy buổi trưa +20h', href: 'khamcaugiay20h.html', adminOnly: true },
        { id: 'khamlongbien', label: 'Lịch khám Long Biên', href: 'khamlongbien.html', adminOnly: true },
        { id: 'khamsomTruaLB', label: 'Lịch khám sớm + khám trưa Long Biên', href: 'khamsomTruaLB.html', adminOnly: true },
        { id: 'tieuphau', label: 'Lịch tiểu phẫu', href: 'tieuphau.html', adminOnly: true },
        { id: 'khamsanSieuamVip', label: 'Lịch khám Sản + Siêu âm VIP', href: 'khamsanSieuamVip.html', adminOnly: true },
        { id: 'phumo', label: 'Lịch phụ mổ', href: 'phumo.html', adminOnly: true },
        { id: 'tang4', label: 'Lịch tầng 4', href: 'tang4.html', adminOnly: true },
        { id: 'cvcot1', label: 'Cv cột 1', href: 'cvcot1.html', adminOnly: true },
        { id: 'hoichancot1', label: 'Lịch hội chẩn cột1', href: 'hoichancot1.html', adminOnly: true },
        { id: 'livetream', label: 'Lịch livetream', href: 'livetream.html', adminOnly: true },
        { id: 'cvcot23', label: 'Cv cột 2+3', href: 'cvcot23.html', adminOnly: true },
        { id: 'khamhotropk', label: 'Khám hỗ trợ PK', href: 'khamhotropk.html', adminOnly: true },
        { id: 'tructhuongtru', label: 'Lịch trực thường trú', href: 'tructhuongtru.html', adminOnly: true },
        { id: 'lamviechangngay', label: 'Lịch khám chủ nhật', href: 'lamviechangngay.html', adminOnly: true },
        { id: 'lichlamviec', label: 'Lịch làm việc', href: 'lichlamviec.html', adminOnly: true },
        { id: 'nghiphep', label: 'Đăng Ký Nghỉ Phép', href: 'nghiphep.html', adminOnly: false },
        { id: 'lichtruc', label: 'Lịch Trực', href: 'lichtruc.html', adminOnly: true },
        { id: 'hosobenhnhan', label: 'Hồ Sơ Bệnh Án', href: 'hosobenhnhan.html', adminOnly: false }
    ];

    var tabHtml = tabs.map(function (t) {
        if (t.hidden) return '';
        var active = (t.id === currentTab) ? ' active' : '';
        var cls = 'tab' + (t.adminOnly ? ' admin-only' : '') + active;
        var href = t.id === '' ? t.href : t.href;
        var titleAttr = (t.id === '') ? ' title="Trang chủ" aria-label="Trang chủ"' : (' title="' + t.label + '"');
        return '<a class="' + cls + '" data-tab="' + t.id + '" href="' + href + '"' + titleAttr + '>' + t.label + '</a>';
    }).join('');

    var headerHtml =
        '<div class="header">' +
        '  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">' +
        '    <h1 style="margin: 0; flex: 1;">🏥 TRỢ LÝ BÁC SĨ</h1>' +
        '    <div style="display: flex; gap: 10px; align-items: center;">' +
        '      <a href="/" class="change-password-btn" style="margin: 0; text-decoration: none; color: inherit;">🔗 BVTA_link</a>' +
        '      <a href="/" class="change-password-btn" style="margin: 0; text-decoration: none; color: inherit;">📋 Quy định chung</a>' +
        '    </div>' +
        '  </div>' +
        '  <div id="userInfo" class="user-info" style="display: none;">' +
        '    <span id="userNameDisplay"></span>' +
        '    <div>' +
        '      <button id="notifBtn" class="change-password-btn" onclick="openNotifications()" style="margin-right:8px;">🔔 <span id="notifCount" style="font-weight:700; margin-left:6px; color:#fff; background:#e74c3c; padding:2px 6px; border-radius:10px; font-size:12px; display:none;">0</span></button>' +
        '      <button class="change-password-btn" onclick="showChangePassword()">Đổi Mật Khẩu</button>' +
        '      <button class="change-password-btn" id="fullscreenBtn" onclick="toggleFullScreen()" style="margin-left:8px;">⛶ Toàn màn hình</button>' +
        '      <button class="logout-btn" onclick="logout()">Đăng Xuất</button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="tabs">' + tabHtml + '</div>' +
        '</div>';

    placeholder.innerHTML = headerHtml;
})();
