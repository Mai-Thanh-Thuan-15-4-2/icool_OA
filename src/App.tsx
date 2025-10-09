import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

interface User {
  user_id: string;
}

interface ApiResponse {
  error: number;
  data?: {
    users?: User[];
    total?: number;
    attachment_id?: string;
  };
  message?: string;
}

interface MessageHistory {
  user_id: string;
  timestamp: number;
}

interface TableRow {
  key: string;
  value: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('userList');
  const [accessToken, setAccessToken] = useState('');
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(50);
  const [lastInteraction, setLastInteraction] = useState('TODAY');
  const [dateRange, setDateRange] = useState('');
  const [isFollower, setIsFollower] = useState('true');
  const [attachmentId, setAttachmentId] = useState('');
  const [headerContent, setHeaderContent] = useState('🎤 Khai trương ICOOL Sư Vạn Hạnh');
  const [messageContent, setMessageContent] = useState(
    'Tưng bừng khai trương – ICOOL Sư Vạn Hạnh chính thức chào đón Quý Khách đến khám phá không gian âm nhạc đỉnh cao, công nghệ Karaoke mới nhất lần đầu tiên có mặt tại Việt Nam cùng với ưu đãi: GIẢM 50% GIỜ HÁT'
  );
  const [tableRows, setTableRows] = useState<TableRow[]>([
    { key: 'Tên khách hàng', value: 'Duyên' },
    { key: 'Mã ưu đãi', value: 'ACBDBMN' },
  ]);
  const [enableTable, setEnableTable] = useState(true);
  const [footerContent, setFooterContent] = useState(
    'Áp dụng tại chi nhánh ICOOL Sư Vạn Hạnh trong thời gian khai trương'
  );
  const [userListResponse, setUserListResponse] = useState('');
  const [uploadResponse, setUploadResponse] = useState('');
  const [messageResponse, setMessageResponse] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [userId, setUserId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Memoize the copy function
  const copyAttachmentId = useCallback((id: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(id)
        .then(() => {
          alert('Đã copy attachment ID thành công!');
        })
        .catch(() => {
          fallbackCopy(id);
        });
    } else {
      fallbackCopy(id);
    }
  }, []);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Đã copy attachment ID thành công!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Không thể copy attachment ID');
    }
  };

  // Load access token, message history, and user ID from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('zalo_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
    const savedHistory = localStorage.getItem('message_history');
    if (savedHistory) {
      setMessageHistory(JSON.parse(savedHistory));
    }
    const savedUserId = localStorage.getItem('self_user_id');
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  // Save access token to localStorage
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('zalo_access_token', accessToken);
    }
  }, [accessToken]);

  // Save message history to localStorage
  useEffect(() => {
    if (messageHistory.length > 0) {
      localStorage.setItem('message_history', JSON.stringify(messageHistory));
    }
  }, [messageHistory]);

  // Save user ID to localStorage
  useEffect(() => {
    if (userId) {
      localStorage.setItem('self_user_id', userId);
    }
  }, [userId]);

  // Add global copy function
  useEffect(() => {
    (window as any).copyAttachmentId = copyAttachmentId;
    return () => {
      delete (window as any).copyAttachmentId;
    };
  }, [copyAttachmentId]);

  // Handle table row changes
  const handleTableRowChange = (index: number, field: 'key' | 'value', value: string) => {
    const newRows = [...tableRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setTableRows(newRows);
  };

  // Handle file selection or drop
  const handleFile = (file: File | undefined) => {
    if (!file) {
      setUploadResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">Vui lòng chọn file ảnh.</pre>'
      );
      setPreviewImage(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.</pre>'
      );
      setPreviewImage(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">Vui lòng chọn file ảnh hợp lệ.</pre>'
      );
      setPreviewImage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    uploadImage(file);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

// Fetch user list directly from Zalo API
  const fetchUsers = async () => {
    if (!accessToken.trim()) {
      setUserListResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">Vui lòng nhập Access Token.</pre>'
      );
      return;
    }

    const queryData = {
      offset: parseInt(offset.toString()),
      count: Math.min(parseInt(count.toString()), 50),
      last_interaction_period: lastInteraction === 'custom' ? dateRange : lastInteraction,
      is_follower: isFollower,
    };
    const queryString = `data=${encodeURIComponent(JSON.stringify(queryData))}`;

    try {
      setUserListResponse('<h3 class="text-lg font-semibold text-blue-600">Đang tải danh sách...</h3>');
      const response = await fetch(`https://openapi.zalo.me/v3.0/oa/user/getlist?${queryString}`, {
        method: 'GET',
        headers: {
          'access_token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Zalo API error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (result.error === 0 && result.data?.users && result.data.users.length > 0) {
        let tableHtml = `
          <h3 class="text-lg font-semibold text-gray-700 mb-4">Danh sách người dùng</h3>
          <div class="overflow-x-auto">
            <table class="w-full bg-white rounded-xl shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <th class="py-4 px-6 text-left font-semibold">STT</th>
                  <th class="py-4 px-6 text-left font-semibold">User ID</th>
                </tr>
              </thead>
              <tbody>
        `;
        result.data.users.forEach((user, index) => {
          tableHtml += `
            <tr class="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100">
              <td class="py-3 px-6 text-gray-700">${index + 1}</td>
              <td class="py-3 px-6 text-gray-700 font-mono text-sm">${user.user_id}</td>
            </tr>
          `;
        });
        tableHtml += `
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-gray-600 font-medium">Tổng số: ${result.data.total}</p>
        `;
        setUserListResponse(tableHtml);
        setUserIds(result.data.users.map((user) => user.user_id));
      } else if (result.error === 0 && (!result.data?.users || result.data.users.length === 0)) {
        setUserListResponse(
          '<h3 class="text-lg font-semibold text-gray-700">Kết quả:</h3><p class="text-gray-600">Không tìm thấy người dùng nào.</p>'
        );
      } else {
        setUserListResponse(
          `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${JSON.stringify(
            result,
            null,
            2
          )}</pre>`
        );
      }
    } catch (error: any) {
      setUserListResponse(
        `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${
          error.message
        }</pre>`
      );
    }
  };

  // Upload image to Zalo API
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadResponse('<h3 class="text-lg font-semibold text-blue-600">Đang tải ảnh lên...</h3>');
      const response = await fetch(
        'https://openapi.zalo.me/v2.0/oa/upload/image',
        {
          method: 'POST',
          headers: {
            'access_token': accessToken,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Zalo API error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (result.error === 0 && result.data?.attachment_id) {
        const attachmentIdValue = result.data.attachment_id;
        setUploadResponse(`
          <h3 class="text-lg font-semibold text-green-600 mb-4">Tải ảnh thành công!</h3>
          <div class="attachment-id-container">
            <label class="block text-gray-700 font-semibold mb-2">Attachment ID:</label>
            <div class="flex items-center gap-3">
              <span class="attachment-id flex-1 p-2 border rounded-lg bg-gray-50 text-sm font-mono overflow-x-auto">${attachmentIdValue}</span>
              <button class="btn-secondary" onclick="window.copyAttachmentId('${attachmentIdValue}')">Copy</button>
            </div>
          </div>
        `);
        setAttachmentId(attachmentIdValue);
      } else {
        setUploadResponse(
          `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${JSON.stringify(
            result,
            null,
            2
          )}</pre>`
        );
        setPreviewImage(null);
      }
    } catch (error: any) {
      setUploadResponse(
        `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${
          error.message
        }</pre>`
      );
      setPreviewImage(null);
    }
  };

  // Send messages to a single user
  const sendMessageToUser = async (userId: string, isSelf: boolean = false) => {
    if (!accessToken.trim()) {
      setMessageResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Vui lòng nhập Access Token.</pre>'
      );
      return false;
    }

    if (!attachmentId.trim()) {
      setMessageResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Vui lòng nhập Attachment ID.</pre>'
      );
      return false;
    }

    let tableContentParsed: TableRow[] = [];
    if (enableTable) {
      tableContentParsed = tableRows.filter((row) => row.key.trim() && row.value.trim());
      if (!tableContentParsed.length) {
        setMessageResponse(
          '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Vui lòng nhập ít nhất một hàng trong bảng khi bật nội dung bảng.</pre>'
        );
        return false;
      }
    }

    const currentTime = Date.now();
    const sixtyMinutes = 60 * 60 * 1000;
    const lastSent = messageHistory.find((entry) => entry.user_id === userId);
    if (!isSelf && lastSent && currentTime - lastSent.timestamp < sixtyMinutes) {
      setMessageResponse(
        (prev) =>
          prev +
          `<pre class="bg-red-50 p-3 rounded-lg text-sm text-red-700 mb-2 overflow-x-auto">❌ Lỗi - ${userId}: Đã gửi tin nhắn trong 60 phút qua, vui lòng xóa lịch sử để gửi lại.</pre>`
      );
      return false;
    }

    const payload = {
      recipient: { user_id: userId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'promotion',
            elements: [
              { type: 'banner', attachment_id: attachmentId },
              { type: 'header', align: 'left', content: headerContent },
              { type: 'text', align: 'left', content: messageContent },
              ...(enableTable ? [{ type: 'table', content: tableContentParsed }] : []),
              { type: 'text', align: 'center', content: footerContent },
            ],
            buttons: [
              {
                type: 'oa.open.url',
                title: 'Đặt phòng ngay',
                payload: { url: 'https://zalo.me/s/4496742181481836529/?utm_source=zalo-qr' },
                image_icon: '',
              },
            ],
          },
        },
      },
    };

    try {
      const response = await fetch(
        'https://openapi.zalo.me/v3.0/oa/message/promotion',
        {
          method: 'POST',
          headers: {
            'access_token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Zalo API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error === 0) {
        if (!isSelf) {
          setMessageHistory((prev) => [...prev, { user_id: userId, timestamp: Date.now() }]);
        }
        setMessageResponse(
          (prev) =>
            prev +
            `<pre class="bg-green-50 p-3 rounded-lg text-sm text-green-700 mb-2 overflow-x-auto">✅ Thành công - ${userId}: ${JSON.stringify(
              result,
              null,
              2
            )}</pre>`
        );
        return true;
      } else {
        setMessageResponse(
          (prev) =>
            prev +
            `<pre class="bg-red-50 p-3 rounded-lg text-sm text-red-700 mb-2 overflow-x-auto">❌ Lỗi - ${userId}: ${JSON.stringify(
              result,
              null,
              2
            )}</pre>`
        );
        return false;
      }
    } catch (error: any) {
      setMessageResponse(
        (prev) =>
          prev +
          `<pre class="bg-red-50 p-3 rounded-lg text-sm text-red-700 mb-2 overflow-x-auto">❌ Lỗi kết nối - ${userId}: ${
            error.message
          }</pre>`
      );
      return false;
    }
  };

  // Send messages to customers
  const sendMessagesToCustomers = async () => {
    if (!userIds.length) {
      setMessageResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Không có user ID nào. Vui lòng lấy danh sách người dùng trước.</pre>'
      );
      return;
    }

    setMessageResponse('<h3 class="text-lg font-semibold text-blue-600">Đang gửi tin nhắn...</h3>');
    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIds.slice(0, 50)) {
      const success = await sendMessageToUser(userId);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setMessageResponse(
      (prev) =>
        prev +
        `<div class="mt-4 p-4 bg-blue-50 rounded-lg"><h4 class="font-semibold text-blue-700">Tổng kết:</h4><p class="text-blue-600">Thành công: ${successCount} | Lỗi: ${errorCount}</p></div>`
    );
  };

  // Send message to self
  const sendMessageToSelf = async () => {
    if (!userId.trim()) {
      setMessageResponse(
        '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Vui lòng nhập User ID của bạn trong phần Cấu hình.</pre>'
      );
      return;
    }

    setMessageResponse('<h3 class="text-lg font-semibold text-blue-600">Đang gửi tin nhắn...</h3>');
    const success = await sendMessageToUser(userId, true);
    setMessageResponse(
      (prev) =>
        prev +
        `<div class="mt-4 p-4 bg-blue-50 rounded-lg"><h4 class="font-semibold text-blue-700">Tổng kết:</h4><p class="text-blue-600">${
          success ? 'Gửi thành công!' : 'Gửi thất bại.'
        }</p></div>`
    );
  };

  // Clear message history
  const clearMessageHistory = () => {
    setMessageHistory([]);
    localStorage.removeItem('message_history');
    alert('Đã xóa lịch sử gửi tin!');
  };

  // Render message history table
  const renderMessageHistory = () => {
    if (messageHistory.length === 0) {
      return `
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Lịch sử gửi tin</h3>
        <p class="text-gray-600">Chưa có tin nhắn nào được gửi.</p>
      `;
    }

    let tableHtml = `
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Lịch sử gửi tin</h3>
      <div class="overflow-x-auto">
        <table class="w-full bg-white rounded-xl shadow-lg">
          <thead>
            <tr class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <th class="py-4 px-6 text-left font-semibold">STT</th>
              <th class="py-4 px-6 text-left font-semibold">User ID</th>
              <th class="py-4 px-6 text-left font-semibold">Thời gian gửi</th>
            </tr>
          </thead>
          <tbody>
    `;
    messageHistory.forEach((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleString('vi-VN');
      tableHtml += `
        <tr class="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100">
          <td class="py-3 px-6 text-gray-700">${index + 1}</td>
          <td class="py-3 px-6 text-gray-700 font-mono text-sm">${entry.user_id}</td>
          <td class="py-3 px-6 text-gray-700">${date}</td>
        </tr>
      `;
    });
    tableHtml += `
          </tbody>
        </table>
      </div>
      <button class="btn-danger w-full mt-4" onclick="clearMessageHistory()">Xóa lịch sử</button>
    `;
    return tableHtml;
  };

  // Expose clearMessageHistory to global scope
  useEffect(() => {
    (window as any).clearMessageHistory = clearMessageHistory;
    return () => {
      delete (window as any).clearMessageHistory;
    };
  }, []);

  // Handle modal
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const saveUserId = () => {
    if (userId.trim()) {
      localStorage.setItem('self_user_id', userId);
      alert('Đã lưu User ID!');
      closeModal();
    } else {
      alert('Vui lòng nhập User ID.');
    }
  };

  return (
    <div className="main-bg p-5">
      <div className="max-w-4xl mx-auto glass-container rounded-3xl p-8 relative z-10">
        {/* Config Icon */}
        <button
          onClick={openModal}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
          title="Cấu hình User ID"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="text-xl font-semibold mb-4 text-center">Cấu hình User ID</h2>
              <label className="block form-label mb-3">User ID của bạn</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Nhập User ID của bạn"
                className="input-field mb-4"
              />
              <div className="flex gap-4">
                <button onClick={closeModal} className="btn-secondary flex-1">
                  Đóng
                </button>
                <button onClick={saveUserId} className="btn-primary flex-1">
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="logo-text gradient-text">ZALO OA ICOOL</h1>
          <p className="subtitle-text">
            Hệ thống quản lý tin nhắn và người dùng Zalo Official Account
          </p>
        </div>

        {/* Access Token */}
        <div className="mb-8">
          <label className="block form-label mb-3">Mã truy cập (Access Token)</label>
          <input
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Nhập mã truy cập của bạn"
            className="input-field"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white/60 p-2 rounded-2xl mb-8 border border-gray-200 shadow-lg">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'userList', label: 'Danh sách người dùng' },
              { id: 'uploadImage', label: 'Tải ảnh lên' },
              { id: 'sendMessage', label: 'Gửi tin nhắn' },
              { id: 'messageHistory', label: 'Lịch sử gửi tin' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {/* User List Tab */}
          {activeTab === 'userList' && (
            <div>
              <h2 className="section-header">Lấy danh sách người dùng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block form-label mb-3">Vị trí bắt đầu (Offset)</label>
                  <input
                    type="number"
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                    min="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block form-label mb-3">Số lượng (Tối đa 50)</label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(Math.min(Number(e.target.value), 50))}
                    min="1"
                    max="50"
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block form-label mb-3">Thời gian tương tác cuối</label>
                  <select
                    value={lastInteraction}
                    onChange={(e) => setLastInteraction(e.target.value)}
                    className="input-field"
                  >
                    <option value="TODAY">Hôm nay</option>
                    <option value="YESTERDAY">Hôm qua</option>
                    <option value="L7D">7 ngày qua</option>
                    <option value="L30D">30 ngày qua</option>
                    <option value="custom">Tùy chỉnh khoảng thời gian</option>
                  </select>
                </div>
                <div>
                  <label className="block form-label mb-3">Là người theo dõi</label>
                  <select
                    value={isFollower}
                    onChange={(e) => setIsFollower(e.target.value)}
                    className="input-field"
                  >
                    <option value="true">Có</option>
                    <option value="false">Không</option>
                  </select>
                </div>
              </div>
              {lastInteraction === 'custom' && (
                <div className="mb-8">
                  <label className="block form-label mb-3">
                    Khoảng thời gian tùy chỉnh (YYYY_MM_DD:YYYY_MM_DD)
                  </label>
                  <input
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    placeholder="ví dụ: 2024_05_22:2024_05_23"
                    className="input-field"
                  />
                </div>
              )}
              <button onClick={fetchUsers} className="btn-primary w-full mb-8">
                Lấy danh sách người dùng
              </button>
              {userListResponse && (
                <div className="response-container" dangerouslySetInnerHTML={{ __html: userListResponse }} />
              )}
            </div>
          )}
          {/* Upload Image Tab */}
          {activeTab === 'uploadImage' && (
            <div>
              <h2 className="section-header">Tải ảnh lên</h2>
              <div className="mb-8">
                <label className="block form-label mb-3">Chọn hoặc kéo thả ảnh</label>
                <div
                  className={`drop-area ${isDragging ? 'drop-area-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="input-file"
                  />
                  <p className="drop-text">
                    Kéo và thả ảnh vào đây hoặc nhấn để chọn ảnh
                  </p>
                </div>
                {previewImage && (
                  <div className="preview-container">
                    <h3 className="preview-title">Xem trước ảnh</h3>
                    <img src={previewImage} alt="Preview" className="preview-image" />
                  </div>
                )}
              </div>
              {uploadResponse && (
                <div className="response-container" dangerouslySetInnerHTML={{ __html: uploadResponse }} />
              )}
            </div>
          )}
          {/* Send Message Tab */}
          {activeTab === 'sendMessage' && (
            <div>
              <h2 className="section-header">Gửi tin nhắn từ danh sách đã lấy</h2>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block form-label mb-3">ID đính kèm (từ Tải ảnh lên)</label>
                  <input
                    type="text"
                    value={attachmentId}
                    onChange={(e) => setAttachmentId(e.target.value)}
                    placeholder="Nhập ID đính kèm"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block form-label mb-3">Nội dung tiêu đề</label>
                  <input
                    type="text"
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block form-label mb-3">Nội dung tin nhắn</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={4}
                    className="input-field resize-vertical"
                  />
                </div>
                <div>
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={enableTable}
                      onChange={(e) => setEnableTable(e.target.checked)}
                      className="mr-2"
                    />
                    <label className="form-label">Bật nội dung bảng</label>
                  </div>
                  <label className="block form-label mb-2">Nội dung bảng</label>
                  <p className="text-sm text-gray-500 mb-3">
                    Ví dụ: Nhãn: Tên khách hàng, Giá trị: Duyên; Nhãn: Mã ưu đãi, Giá trị: ACBDBMN
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tableRows.map((row, index) => (
                      <div key={index} className="flex gap-4">
                        <input
                          type="text"
                          value={row.key}
                          onChange={(e) => handleTableRowChange(index, 'key', e.target.value)}
                          placeholder="Nhãn"
                          className="input-field flex-1"
                          disabled={!enableTable}
                        />
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => handleTableRowChange(index, 'value', e.target.value)}
                          placeholder="Giá trị"
                          className="input-field flex-1"
                          disabled={!enableTable}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block form-label mb-3">Nội dung chân trang</label>
                  <input
                    type="text"
                    value={footerContent}
                    onChange={(e) => setFooterContent(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-4 mb-8">
                <button onClick={sendMessagesToCustomers} className="btn-primary w-3/5">
                  Gửi cho khách hàng
                </button>
                <button onClick={sendMessageToSelf} className="btn-primary w-2/5">
                  Gửi cho bạn (test)
                </button>
              </div>
              {messageResponse && (
                <div className="response-container" dangerouslySetInnerHTML={{ __html: messageResponse }} />
              )}
            </div>
          )}
          {/* Message History Tab */}
          {activeTab === 'messageHistory' && (
            <div>
              <h2 className="section-header">Lịch sử gửi tin</h2>
              <div className="response-container" dangerouslySetInnerHTML={{ __html: renderMessageHistory() }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;