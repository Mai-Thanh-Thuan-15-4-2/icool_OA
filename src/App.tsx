import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from 'xlsx';
import "./App.css";

interface User {
  user_id: string;
  display_name?: string;
  code?: string;
}

interface UserDetail {
  user_id: string;
  display_name: string;
  user_alias: string;
  avatar: string;
  user_is_follower: boolean;
  user_last_interaction_date: string;
}

interface ApiResponse {
  error: number;
  data?: {
    users?: User[];
    total?: number;
    attachment_id?: string;
    user_id?: string;
    display_name?: string;
    user_alias?: string;
    avatar?: string;
    user_is_follower?: boolean;
    user_last_interaction_date?: string;
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

interface UserHistory {
  id: string;
  user_id: string;
  display_name: string;
  code: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("userList");
  const [accessToken, setAccessToken] = useState("");
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(50);
  const [lastInteraction, setLastInteraction] = useState("TODAY");
  const [dateRange, setDateRange] = useState("");
  const [isFollower, setIsFollower] = useState("true");
  const [attachmentId, setAttachmentId] = useState("");
  const [headerContent, setHeaderContent] = useState(
    "🎤 Khai trương ICOOL Sư Vạn Hạnh"
  );
  const [messageContent, setMessageContent] = useState(
    "Tưng bừng khai trương – ICOOL Sư Vạn Hạnh chính thức chào đón Quý Khách đến khám phá không gian âm nhạc đỉnh cao, công nghệ Karaoke mới nhất lần đầu tiên có mặt tại Việt Nam cùng với ưu đãi: GIẢM 50% GIỜ HÁT"
  );
  const [tableRows, setTableRows] = useState<TableRow[]>([
    { key: "Tên khách hàng", value: "Duyên" },
    { key: "Mã ưu đãi", value: "ACBDBMN" },
  ]);
  const [enableTable, setEnableTable] = useState(true);
  const [footerContent, setFooterContent] = useState(
    "Áp dụng tại chi nhánh ICOOL Sư Vạn Hạnh trong thời gian khai trương"
  );
  const [userListResponse, setUserListResponse] = useState("");
  const [uploadResponse, setUploadResponse] = useState("");
  const [messageResponse, setMessageResponse] = useState("");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [userId, setUserId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachmentHistory, setAttachmentHistory] = useState<string[]>([]);
  
  // Button configuration states
  const [enableBookingButton, setEnableBookingButton] = useState(true);
  const [bookingButtonTitle, setBookingButtonTitle] = useState("Đặt phòng ngay");
  const [bookingButtonUrl, setBookingButtonUrl] = useState("https://zalo.me/s/4496742181481836529/?utm_source=zalo-qr");
  const [enableDetailButton, setEnableDetailButton] = useState(false);
  const [detailButtonTitle, setDetailButtonTitle] = useState("Xem chi tiết");
  const [detailButtonUrl, setDetailButtonUrl] = useState("https://karaoke.com.vn/tin-tuc/");
  const [enableFooter, setEnableFooter] = useState(true);
  
  // User history states
  const [userHistory, setUserHistory] = useState<UserHistory[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  
  // Table data source preferences  
  const [useUserName, setUseUserName] = useState(true);
  const [useUserCode, setUseUserCode] = useState(true);

  // Load attachment history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('attachmentHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setAttachmentHistory(history);
        // Set the most recent attachment ID if available
        if (history.length > 0) {
          setAttachmentId(history[0]);
        }
      } catch (error) {
        console.error('Error loading attachment history:', error);
      }
    }
    
    // Load user history
    const savedUserHistory = localStorage.getItem('userHistory');
    if (savedUserHistory) {
      try {
        const history = JSON.parse(savedUserHistory);
        setUserHistory(history);
      } catch (error) {
        console.error('Error loading user history:', error);
      }
    }
  }, []);

  // Function to save user to history
  const saveUserToHistory = (user: User) => {
    const historyItem: UserHistory = {
      id: `${user.user_id}_${Date.now()}`,
      user_id: user.user_id,
      display_name: user.display_name || 'Không có tên',
      code: user.code || '',
      timestamp: Date.now()
    };
    
    setUserHistory(prevHistory => {
      // Remove duplicate if exists
      const filteredHistory = prevHistory.filter(item => item.user_id !== user.user_id);
      // Add new item to the beginning
      const newHistory = [historyItem, ...filteredHistory];
      // Keep only latest 50 items
      const limitedHistory = newHistory.slice(0, 50);
      
      // Save to localStorage
      localStorage.setItem('userHistory', JSON.stringify(limitedHistory));
      
      return limitedHistory;
    });
  };

  // Function to delete selected history items
  const deleteSelectedHistory = () => {
    if (selectedHistoryIds.length === 0) {
      alert('Vui lòng chọn ít nhất một mục để xóa!');
      return;
    }
    
    if (confirm(`Bạn có chắc muốn xóa ${selectedHistoryIds.length} mục đã chọn?`)) {
      setUserHistory(prevHistory => {
        const newHistory = prevHistory.filter(item => !selectedHistoryIds.includes(item.id));
        localStorage.setItem('userHistory', JSON.stringify(newHistory));
        return newHistory;
      });
      
      // Also remove corresponding message history for selected users
      const selectedUserIds = userHistory
        .filter(item => selectedHistoryIds.includes(item.id))
        .map(item => item.user_id);
      
      setMessageHistory(prevMessageHistory => 
        prevMessageHistory.filter(msg => !selectedUserIds.includes(msg.user_id))
      );
      
      setSelectedHistoryIds([]);
    }
  };

  // Function to delete single history item
  const deleteSingleHistory = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa mục này?')) {
      // Find the user_id for this history item
      const historyItem = userHistory.find(item => item.id === id);
      const userId = historyItem?.user_id;
      
      setUserHistory(prevHistory => {
        const newHistory = prevHistory.filter(item => item.id !== id);
        localStorage.setItem('userHistory', JSON.stringify(newHistory));
        return newHistory;
      });
      
      // Also remove corresponding message history for this user
      if (userId) {
        setMessageHistory(prevMessageHistory => 
          prevMessageHistory.filter(msg => msg.user_id !== userId)
        );
      }
      
      // Remove from selected if it was selected
      setSelectedHistoryIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  // Function to toggle history item selection
  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  // Function to select/deselect all history items
  const toggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === userHistory.length) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(userHistory.map(item => item.id));
    }
  };

  // Function to clear all history
  const clearAllHistory = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
      setUserHistory([]);
      setSelectedHistoryIds([]);
      setMessageHistory([]); // Also clear message history (60 minutes rule)
      localStorage.removeItem('userHistory');
    }
  };

  // Function to save attachment ID to localStorage history
  const saveAttachmentToHistory = (newAttachmentId: string) => {
    setAttachmentHistory(prevHistory => {
      // Remove if already exists to avoid duplicates
      const filteredHistory = prevHistory.filter(id => id !== newAttachmentId);
      // Add new ID to the beginning
      const newHistory = [newAttachmentId, ...filteredHistory];
      // Keep only the latest 3 IDs
      const limitedHistory = newHistory.slice(0, 3);
      
      // Save to localStorage
      localStorage.setItem('attachmentHistory', JSON.stringify(limitedHistory));
      
      return limitedHistory;
    });
  };

  // Function to add new table row
  const addTableRow = () => {
    if (tableRows.length >= 2) {
      alert('Tối đa 2 dòng!');
      return;
    }
    setTableRows(prev => [...prev, { key: "", value: "" }]);
  };

  // Function to remove table row
  const removeTableRow = (index: number) => {
    if (tableRows.length <= 1) {
      alert('Tối thiểu 1 dòng!');
      return;
    }
    setTableRows(prev => prev.filter((_, i) => i !== index));
  };

  // Memoize the copy function
  const copyAttachmentId = useCallback((id: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(id)
        .then(() => {
          alert("Đã copy attachment ID thành công!");
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
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Đã copy attachment ID thành công!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("Không thể copy attachment ID");
    }
  };

  // Update code for a user
  const updateUserCode = useCallback((userId: string, code: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.user_id === userId ? { ...user, code } : user
      )
    );
  }, []);

  // Remove user from list
  const removeUser = useCallback((userId: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.user_id !== userId));
    setUserIds(prevUserIds => prevUserIds.filter(id => id !== userId));
    
    // Update the table display
    const updatedUsers = users.filter(user => user.user_id !== userId);
    if (updatedUsers.length === 0) {
      setUserListResponse(
        '<h3 class="text-lg font-semibold text-gray-700">Kết quả:</h3><p class="text-gray-600">Không có người dùng nào trong danh sách.</p>'
      );
      return;
    }
    
    let tableHtml = `
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Danh sách người dùng</h3>
      <div class="overflow-x-auto">
        <table class="w-full bg-white rounded-xl shadow-lg">
          <thead>
            <tr class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <th class="py-4 px-6 text-left font-semibold">STT</th>
              <th class="py-4 px-6 text-left font-semibold">User ID</th>
              <th class="py-4 px-6 text-left font-semibold">Tên hiển thị</th>
              <th class="py-4 px-6 text-left font-semibold">Code</th>
              <th class="py-4 px-6 text-left font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;
    updatedUsers.forEach((user, index) => {
      tableHtml += `
        <tr class="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100">
          <td class="py-3 px-6 text-gray-700">${index + 1}</td>
          <td class="py-3 px-6 text-gray-700 font-mono text-sm">${user.user_id}</td>
          <td class="py-3 px-6 text-gray-700">${user.display_name}</td>
          <td class="py-3 px-6">
            <input 
              type="text" 
              value="${user.code || ''}" 
              onchange="window.updateUserCode('${user.user_id}', this.value)"
              class="code-input"
              placeholder="Nhập mã (khuyến mãi, tên, v.v.)"
            />
          </td>
          <td class="py-3 px-6">
            <button 
              onclick="window.removeUser('${user.user_id}')"
              class="delete-btn"
              title="Xóa user này khỏi danh sách"
            >
             Xóa
            </button>
          </td>
        </tr>
      `;
    });
    tableHtml += `
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-gray-600 font-medium">Tổng số: ${updatedUsers.length}</p>
    `;
    setUserListResponse(tableHtml);
  }, [users]);

  // Export users to Excel file
  const exportUsers = useCallback(() => {
    if (users.length === 0) {
      alert("Không có dữ liệu người dùng để xuất!");
      return;
    }

    // Prepare data for Excel
    const exportData = users.map((user, index) => ({
      'STT': index + 1,
      'User ID': user.user_id,
      'Tên hiển thị': user.display_name || 'Không có tên',
      'Code': user.code || ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const columnWidths = [
      { wch: 8 },  // STT
      { wch: 25 }, // User ID
      { wch: 30 }, // Tên hiển thị
      { wch: 20 }  // Code
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách khách hàng');

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `danh-sach-khach-hang-${today}.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, filename);
    
    alert(`Đã xuất ${users.length} người dùng ra file Excel thành công!`);
  }, [users]);

  // Import users from Excel file
  const importUsers = useCallback((file: File) => {
    if (!file) return;

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert("Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          alert("File Excel không có dữ liệu!");
          return;
        }

        // Map Excel data to User format
        const importedUsers: User[] = [];
        
        jsonData.forEach((row: any, index: number) => {
          // Try to find User ID from different possible column names
          const userId = row['User ID'] || row['user_id'] || row['UserID'] || row['ID'];
          
          if (userId && typeof userId === 'string') {
            const user: User = {
              user_id: userId.toString().trim(),
              display_name: (row['Tên hiển thị'] || row['display_name'] || row['Name'] || row['Tên'] || 'Không có tên').toString(),
              code: (row['Code'] || row['code'] || row['Mã'] || '').toString()
            };
            importedUsers.push(user);
          } else {
            console.warn(`Dòng ${index + 1}: Không tìm thấy User ID hợp lệ`);
          }
        });

        if (importedUsers.length === 0) {
          alert("Không tìm thấy dữ liệu người dùng hợp lệ trong file!\nVui lòng đảm bảo file có cột 'User ID'.");
          return;
        }

        // Update users state
        setUsers(importedUsers);
        setUserIds(importedUsers.map(user => user.user_id));

        // Update table display
        let tableHtml = `
          <h3 class="text-lg font-semibold text-gray-700 mb-4">Danh sách người dùng (Đã nhập từ Excel)</h3>
          <div class="overflow-x-auto">
            <table class="w-full bg-white rounded-xl shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <th class="py-4 px-6 text-left font-semibold">STT</th>
                  <th class="py-4 px-6 text-left font-semibold">User ID</th>
                  <th class="py-4 px-6 text-left font-semibold">Tên hiển thị</th>
                  <th class="py-4 px-6 text-left font-semibold">Code</th>
                  <th class="py-4 px-6 text-left font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
        `;
        importedUsers.forEach((user, index) => {
          tableHtml += `
            <tr class="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100">
              <td class="py-3 px-6 text-gray-700">${index + 1}</td>
              <td class="py-3 px-6 text-gray-700 font-mono text-sm">${user.user_id}</td>
              <td class="py-3 px-6 text-gray-700">${user.display_name}</td>
              <td class="py-3 px-6">
                <input 
                  type="text" 
                  value="${user.code || ''}" 
                  onchange="window.updateUserCode('${user.user_id}', this.value)"
                  class="code-input"
                  placeholder="Nhập mã (khuyến mãi, tên, v.v.)"
                />
              </td>
              <td class="py-3 px-6">
                <button 
                  onclick="window.removeUser('${user.user_id}')"
                  class="delete-btn"
                  title="Xóa user này khỏi danh sách"
                >
                  Xóa
                </button>
              </td>
            </tr>
          `;
        });
        tableHtml += `
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-gray-600 font-medium">Tổng số: ${importedUsers.length}</p>
        `;
        setUserListResponse(tableHtml);

        alert(`Đã nhập thành công ${importedUsers.length} người dùng từ file Excel!`);
      } catch (error) {
        console.error('Import error:', error);
        alert("Lỗi khi đọc file Excel! Vui lòng kiểm tra định dạng file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Handle import file selection
  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importUsers(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [importUsers]);

  // Load access token, message history, and user ID from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("zalo_access_token");
    if (savedToken) {
      setAccessToken(savedToken);
    }
    const savedHistory = localStorage.getItem("message_history");
    if (savedHistory) {
      setMessageHistory(JSON.parse(savedHistory));
    }
    const savedUserId = localStorage.getItem("self_user_id");
    if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  // Save access token to localStorage
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem("zalo_access_token", accessToken);
    }
  }, [accessToken]);

  // Save message history to localStorage
  useEffect(() => {
    if (messageHistory.length > 0) {
      localStorage.setItem("message_history", JSON.stringify(messageHistory));
    }
  }, [messageHistory]);

  // Save user ID to localStorage
  useEffect(() => {
    if (userId) {
      localStorage.setItem("self_user_id", userId);
    }
  }, [userId]);

  // Fix the global window function declarations
  useEffect(() => {
    // Define global copy function for inline onclick handlers
    (window as any).copyAttachmentId = copyAttachmentId;

    // Define global clear function
    (window as any).clearMessageHistory = () => {
      setMessageHistory([]);
      localStorage.removeItem("message_history");
      alert("Đã xóa lịch sử gửi tin!");
    };

    // Define global updateUserCode function
    (window as any).updateUserCode = updateUserCode;

    // Define global removeUser function
    (window as any).removeUser = removeUser;

    // Cleanup
    return () => {
      delete (window as any).copyAttachmentId;
      delete (window as any).clearMessageHistory;
      delete (window as any).updateUserCode;
      delete (window as any).removeUser;
    };
  }, [copyAttachmentId, updateUserCode, removeUser]);

  // Handle table row changes
  const handleTableRowChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
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

    if (!file.type.startsWith("image/")) {
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

  // Fetch user detail from Zalo API
  const fetchUserDetail = async (userId: string): Promise<UserDetail | null> => {
    try {
      const queryData = { user_id: userId };
      const queryString = `data=${encodeURIComponent(JSON.stringify(queryData))}`;
      
      const response = await fetch(
        `https://openapi.zalo.me/v3.0/oa/user/detail?${queryString}`,
        {
          method: "GET",
          headers: {
            access_token: accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      if (result.error === 0 && result.data) {
        return {
          user_id: result.data.user_id || userId,
          display_name: result.data.display_name || "Không có tên",
          user_alias: result.data.user_alias || "",
          avatar: result.data.avatar || "",
          user_is_follower: result.data.user_is_follower || false,
          user_last_interaction_date: result.data.user_last_interaction_date || ""
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching user detail for ${userId}:`, error);
      return null;
    }
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
      last_interaction_period:
        lastInteraction === "custom" ? dateRange : lastInteraction,
      is_follower: isFollower,
    };
    const queryString = `data=${encodeURIComponent(JSON.stringify(queryData))}`;

    try {
      setUserListResponse(
        '<h3 class="text-lg font-semibold text-blue-600">Đang tải danh sách...</h3>'
      );
      const response = await fetch(
        `https://openapi.zalo.me/v3.0/oa/user/getlist?${queryString}`,
        {
          method: "GET",
          headers: {
            access_token: accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Zalo API error: ${response.status} ${response.statusText}`
        );
      }

      const result: ApiResponse = await response.json();

      if (
        result.error === 0 &&
        result.data?.users &&
        result.data.users.length > 0
      ) {
        // Fetch user details for each user
        setUserListResponse(
          '<h3 class="text-lg font-semibold text-blue-600">Đang tải thông tin chi tiết...</h3>'
        );
        
        const usersWithDetails: User[] = [];
        for (const user of result.data.users) {
          const userDetail = await fetchUserDetail(user.user_id);
          usersWithDetails.push({
            user_id: user.user_id,
            display_name: userDetail?.display_name || "Không có tên",
            code: ""
          });
        }
        
        setUsers(usersWithDetails);
        setUserIds(usersWithDetails.map(user => user.user_id));

        let tableHtml = `
          <h3 class="text-lg font-semibold text-gray-700 mb-4">Danh sách người dùng</h3>
          <div class="overflow-x-auto">
            <table class="w-full bg-white rounded-xl shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <th class="py-4 px-6 text-left font-semibold">STT</th>
                  <th class="py-4 px-6 text-left font-semibold">User ID</th>
                  <th class="py-4 px-6 text-left font-semibold">Tên hiển thị</th>
                  <th class="py-4 px-6 text-left font-semibold">Code</th>
                  <th class="py-4 px-6 text-left font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
        `;
        usersWithDetails.forEach((user, index) => {
          tableHtml += `
            <tr class="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100">
              <td class="py-3 px-6 text-gray-700">${index + 1}</td>
              <td class="py-3 px-6 text-gray-700 font-mono text-sm">${user.user_id}</td>
              <td class="py-3 px-6 text-gray-700">${user.display_name}</td>
              <td class="py-3 px-6">
                <input 
                  type="text" 
                  value="${user.code || ''}" 
                  onchange="window.updateUserCode('${user.user_id}', this.value)"
                  class="code-input"
                  placeholder="Nhập mã (khuyến mãi, tên, v.v.)"
                />
              </td>
              <td class="py-3 px-6">
                <button 
                  onclick="window.removeUser('${user.user_id}')"
                  class="delete-btn"
                  title="Xóa user này khỏi danh sách"
                >
                  Xóa️
                </button>
              </td>
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
      } else if (
        result.error === 0 &&
        (!result.data?.users || result.data.users.length === 0)
      ) {
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
        `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${error.message}</pre>`
      );
    }
  };

  // Upload image to Zalo API
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadResponse(
        '<h3 class="text-lg font-semibold text-blue-600">Đang tải ảnh lên...</h3>'
      );
      const response = await fetch(
        "https://openapi.zalo.me/v2.0/oa/upload/image",
        {
          method: "POST",
          headers: {
            access_token: accessToken,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Zalo API error: ${response.status} ${response.statusText}`
        );
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
        // Save to history
        saveAttachmentToHistory(attachmentIdValue);
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
        `<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm overflow-x-auto">${error.message}</pre>`
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

    // Get user data from users array
    const currentUser = users.find(user => user.user_id === userId);
    
    let tableContentParsed: TableRow[] = [];
    if (enableTable) {
      // Build table content dynamically from all table rows that have data
      tableContentParsed = [];
      
      tableRows.forEach((row, index) => {
        // Get user data for this row
        let value = "";
        
        if (index === 0) {
          // First row: check if using user name
          if (useUserName && currentUser?.display_name) {
            value = currentUser.display_name;
          } else {
            value = row.value || "";
          }
        } else if (index === 1) {
          // Second row: check if using user code
          if (useUserCode && currentUser?.code && currentUser.code.trim()) {
            value = currentUser.code;
          } else {
            value = row.value || "";
          }
        } else {
          // Additional rows: use manual input only
          value = row.value || "";
        }
        
        // Only add row if both key and value have content
        if (row.key.trim() && value.trim()) {
          tableContentParsed.push({ key: row.key, value: value });
        }
      });
      
      // Check if we have at least one row with data
      if (tableContentParsed.length === 0) {
        setMessageResponse(
          '<h3 class="text-lg font-semibold text-red-600">Lỗi:</h3><pre class="bg-red-50 p-4 rounded-xl text-red-700 text-sm">Vui lòng nhập ít nhất một dòng có đầy đủ nhãn và giá trị trong bảng.</pre>'
        );
        return false;
      }
    }

    const currentTime = Date.now();
    const sixtyMinutes = 60 * 60 * 1000;
    const lastSent = messageHistory.find((entry) => entry.user_id === userId);
    if (
      !isSelf &&
      lastSent &&
      currentTime - lastSent.timestamp < sixtyMinutes
    ) {
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
          type: "template",
          payload: {
            template_type: "promotion",
            elements: [
              { type: "banner", attachment_id: attachmentId },
              { type: "header", align: "left", content: headerContent },
              { type: "text", align: "left", content: messageContent },
              ...(enableTable
                ? [{ type: "table", content: tableContentParsed }]
                : []),
              ...(enableFooter
                ? [{ type: "text", align: "center", content: footerContent }]
                : []),
            ],
            buttons: [
              ...(enableBookingButton ? [{
                type: "oa.open.url",
                title: bookingButtonTitle,
                payload: {
                  url: bookingButtonUrl,
                },
                image_icon: "",
              }] : []),
              ...(enableDetailButton && detailButtonUrl ? [{
                type: "oa.open.url", 
                title: detailButtonTitle,
                payload: {
                  url: detailButtonUrl,
                },
                image_icon: "https://truongvan.vn/wp-content/uploads/info.png",
              }] : []),
            ],
          },
        },
      },
    };

    try {
      const response = await fetch(
        "https://openapi.zalo.me/v3.0/oa/message/promotion",
        {
          method: "POST",
          headers: {
            access_token: accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Zalo API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.error === 0) {
        if (!isSelf) {
          setMessageHistory((prev) => [
            ...prev,
            { user_id: userId, timestamp: Date.now() },
          ]);
          
          // Save user to history when message sent successfully
          const currentUser = users.find(user => user.user_id === userId);
          if (currentUser) {
            // Get the code that was actually used in the message
            const codeUsed = tableContentParsed.find(row => row.key.includes("ưu đãi") || row.key.includes("code"))?.value || "";
            
            // If user doesn't have code, use manual input code for history
            const finalCode = currentUser.code && currentUser.code.trim() 
              ? currentUser.code 
              : (codeUsed || tableRows[1]?.value || "");
            
            const historyUser = {
              ...currentUser,
              code: finalCode
            };
            saveUserToHistory(historyUser);
          }
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
          `<pre class="bg-red-50 p-3 rounded-lg text-sm text-red-700 mb-2 overflow-x-auto">❌ Lỗi kết nối - ${userId}: ${error.message}</pre>`
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

    setMessageResponse(
      '<h3 class="text-lg font-semibold text-blue-600">Đang gửi tin nhắn...</h3>'
    );
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

    setMessageResponse(
      '<h3 class="text-lg font-semibold text-blue-600">Đang gửi tin nhắn...</h3>'
    );
    const success = await sendMessageToUser(userId, true);
    setMessageResponse(
      (prev) =>
        prev +
        `<div class="mt-4 p-4 bg-blue-50 rounded-lg"><h4 class="font-semibold text-blue-700">Tổng kết:</h4><p class="text-blue-600">${
          success ? "Gửi thành công!" : "Gửi thất bại."
        }</p></div>`
    );
  };

  // Clear message history
  const clearMessageHistory = () => {
    setMessageHistory([]);
    localStorage.removeItem("message_history");
    alert("Đã xóa lịch sử gửi tin!");
  };

  // Fix the renderMessageHistory function
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
            <tr class="bg-gradient-to-r from-gray-800 to-black text-white">
              <th class="py-4 px-6 text-left font-semibold">STT</th>
              <th class="py-4 px-6 text-left font-semibold">User ID</th>
              <th class="py-4 px-6 text-left font-semibold">Thời gian gửi</th>
            </tr>
          </thead>
          <tbody>
    `;
    messageHistory.forEach((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleString("vi-VN");
      tableHtml += `
        <tr class="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100">
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
      <button class="btn-primary w-full mt-4 background-red" onclick="window.clearMessageHistory()">Xóa lịch sử</button>
    `;
    return tableHtml;
  };

  // Handle modal
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const saveUserId = () => {
    if (userId.trim()) {
      localStorage.setItem("self_user_id", userId);
      alert("Đã lưu User ID!");
      closeModal();
    } else {
      alert("Vui lòng nhập User ID.");
    }
  };

  return (
    <div className="main-bg p-5">
      <div className="max-w-4xl mx-auto glass-container rounded-3xl p-8 relative z-10">
        {/* Config Icon */}
        <button
          onClick={openModal}
          className="absolute text-gray-600 hover:text-gray-800 w-10 h-10 flex items-center justify-center"
          title="Cấu hình User ID"
          style={{
            fontSize: "24px",
            top: "20px",
            right: "20px",
          }}
        >
          🔑
        </button>

        {/* Modal */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              maxHeight: "100vh",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "1rem",
                maxWidth: "400px",
                width: "90%",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              }}
            >
              <h2 className="text-xl font-semibold mb-4 text-center">
                Cấu hình User ID
              </h2>
              <label className="block form-label mb-3">User ID của bạn</label>
              <input
                type="text"
                value={userId}
                style={{ width: "90%" }}
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
          <label className="block form-label mb-3">
            Mã truy cập (Access Token)
          </label>
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
              { id: "userList", label: "Danh sách người dùng" },
              { id: "uploadImage", label: "Tải ảnh lên" },
              { id: "sendMessage", label: "Gửi tin nhắn" },
              { id: "customerHistory", label: "Lịch sử khách hàng" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id
                    ? "tab-button-active"
                    : "tab-button-inactive"
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
          {activeTab === "userList" && (
            <div className="mb-6">
              <h2 className="section-header">Lấy danh sách người dùng</h2>

              <div className="flex items-end gap-6 mb-8 flex-nowrap overflow-auto">
                <div className="flex-none">
                  <label className="block form-label mb-3">Vị trí bắt đầu (Offset)</label>
                  <input
                    type="number"
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                    min="0"
                    className="input-field"
                  />
                </div>

                <div className="flex-none">
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

                <div className="flex-none">
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

                <div className="flex-none">
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

              {lastInteraction === "custom" && (
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

              <button
                onClick={fetchUsers}
                className="btn-primary mx-auto block mb-8"
                style={{ width: "300px" }}
              >
                Lấy danh sách người dùng
              </button>

              {/* Export/Import buttons */}
              <div className="flex gap-4 justify-center mb-8">
                <button
                  onClick={exportUsers}
                  className="btn-secondary"
                  disabled={users.length === 0}
                  title={users.length === 0 ? "Không có dữ liệu để xuất" : "Xuất danh sách ra file Excel"}
                >
                  � Xuất Excel
                </button>
                <label className="btn-secondary cursor-pointer">
                  📥 Nhập Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Info about Excel format */}
              <div className="excel-info-box">
                <h4>Định dạng file Excel</h4>
                <ul className="excel-info-list">
                  <li>
                    <strong>Xuất:</strong> File <span className="excel-format-highlight">.xlsx</span> với các cột: 
                    STT, User ID, Tên hiển thị, Code
                  </li>
                  <li>
                    <strong>Nhập:</strong> Chấp nhận file <span className="excel-format-highlight">.xlsx</span>, 
                    <span className="excel-format-highlight">.xls</span>, <span className="excel-format-highlight">.csv</span> với cột bắt buộc là 'User ID'
                  </li>
                  <li>
                    <strong>Lưu ý:</strong> File nhập sẽ thay thế hoàn toàn danh sách hiện tại
                  </li>
                </ul>
              </div>

              {userListResponse && (
                <div
                  className="response-container"
                  dangerouslySetInnerHTML={{ __html: userListResponse }}
                />
              )}
            </div>
          )}
          {/* Upload Image Tab */}
          {activeTab === "uploadImage" && (
            <div>
              <h2 className="section-header">Tải ảnh lên</h2>
              <div className="mb-8">
                <label className="block form-label mb-3">
                  Chọn hoặc kéo thả ảnh
                </label>
                <div
                  className={`drop-area ${
                    isDragging ? "drop-area-active" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="input-file"
                    id="file-input"
                  />
                  <div className="upload-icon">📁</div>
                  <div className="drop-text">
                    <div>Kéo và thả ảnh vào đây</div>
                    <div className="drop-text-secondary">hoặc nhấn để chọn từ máy tính</div>
                  </div>
                </div>
                {previewImage && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Xem trước ảnh</h3>
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-w-full h-auto rounded-lg shadow-lg"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                )}
              </div>
              
              {/* Attachment History Section */}
              {attachmentHistory.length > 0 && (
                <div className="attachment-history-section">
                  <h3 className="attachment-history-title">📋 Lịch sử ID ảnh (3 gần nhất)</h3>
                  <div className="attachment-history-list">
                    {attachmentHistory.map((id, index) => (
                      <div key={id} className="attachment-history-item">
                        <div className="attachment-history-content">
                          <span className="attachment-history-index">#{index + 1}</span>
                          <span className="attachment-history-id">{id}</span>
                          <button
                            onClick={() => {
                              setAttachmentId(id);
                              copyAttachmentId(id);
                            }}
                            className="attachment-history-btn"
                            title="Sử dụng và copy ID này"
                          >
                            Sử dụng
                          </button>
                        </div>
                        {index === 0 && (
                          <span className="attachment-history-latest">Mới nhất</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="attachment-history-note">
                    💡 Click "Sử dụng" để copy ID và áp dụng vào form gửi tin nhắn
                  </div>
                </div>
              )}

              {uploadResponse && (
                <div
                  className="response-container"
                  dangerouslySetInnerHTML={{ __html: uploadResponse }}
                />
              )}
            </div>
          )}
          {/* Send Message Tab */}
          {activeTab === "sendMessage" && (
            <div>
              <h2 className="section-header">Gửi tin nhắn cho khách hàng</h2>

              <div className="message-form-container">
                <div className="form-group">
                  <label className="block form-label">
                    ID đính kèm (từ Tải ảnh lên)
                  </label>
                  <input
                    type="text"
                    value={attachmentId}
                    onChange={(e) => setAttachmentId(e.target.value)}
                    placeholder="Nhập ID đính kèm"
                    className="input-field compact"
                  />
                </div>

                <div className="form-group">
                  <label className="block form-label">
                    Nội dung tiêu đề
                  </label>
                  <input
                    type="text"
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    className="input-field compact"
                  />
                </div>

                <div className="form-group">
                  <label className="block form-label">
                    Nội dung tin nhắn
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={3}
                    className="input-field compact resize-vertical"
                  />
                </div>

                <div className="form-group table-section">
                  <div className="button-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={enableTable}
                        onChange={(e) => setEnableTable(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">
                      📋 Bật nội dung bảng {enableTable ? '(Bật)' : '(Tắt)'}
                    </span>
                  </div>
                  
                  <div className="table-info-compact">
                    <h4 className="table-info-title">📋 Thông tin bảng tự động:</h4>
                    <div className="table-info-grid">
                      <div><strong>Nhãn:</strong> Từ ô bên dưới</div>
                      <div><strong>Dòng 1:</strong> {useUserName ? 'Tên user, nếu không có -> lấy dự phòng bên dưới' : 'Chỉ dự phòng bên dưới'}</div>
                      <div><strong>Dòng 2:</strong> {useUserCode ? 'Code user, nếu không có -> lấy dự phòng bên dưới' : 'Chỉ dự phòng bên dưới'}</div>
                      <div><strong>Hiển thị:</strong> Dòng có dữ liệu</div>
                    </div>
                  </div>

                  <div className="smart-table-tip-compact">
                    <span className="tip-icon">💡</span>
                    <strong>Ví dụ:</strong> Không có code <span className="tip-arrow">→</span> dùng ô "Giá trị" thủ công
                  </div>

                  {enableTable && (
                    <div className="table-data-source">
                      <h5>
                        🎯 Nguồn dữ liệu cho từng dòng:
                      </h5>
                      <div className="checkbox-options">
                        <label className="custom-checkbox-label">
                          <input
                            type="checkbox"
                            checked={useUserName}
                            onChange={(e) => setUseUserName(e.target.checked)}
                            className="custom-checkbox"
                          />
                          <span className="checkbox-label-text">🏷️ Dòng 1: Lấy từ <strong>Tên user</strong></span>
                        </label>
                        <label className="custom-checkbox-label">
                          <input
                            type="checkbox"
                            checked={useUserCode}
                            onChange={(e) => setUseUserCode(e.target.checked)}
                            className="custom-checkbox"
                          />
                          <span className="checkbox-label-text">🔑 Dòng 2: Lấy từ <strong>Code user</strong></span>
                        </label>
                      </div>
                      <div className="checkbox-hint">
                        💡 Không check = dùng giá trị thủ công bên dưới
                      </div>
                    </div>
                  )}

                  <div className="table-config">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                      <p className="table-config-label">Tùy chỉnh nhãn và dữ liệu dự phòng:</p>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button
                          type="button"
                          onClick={addTableRow}
                          disabled={!enableTable || tableRows.length >= 2}
                          className="btn-compact btn-secondary-compact"
                          title="Thêm dòng mới"
                        >
                          ➕ Thêm dòng
                        </button>
                      </div>
                    </div>
                    <div className="table-rows-grid">
                      {tableRows.map((row, index) => (
                        <div key={index} className="table-row-inputs" style={{position: 'relative'}}>
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) =>
                              handleTableRowChange(index, "key", e.target.value)
                            }
                            placeholder="Nhãn"
                            className="input-field compact table-input"
                            style={{width: "90%"}}
                            disabled={!enableTable}
                          />
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) =>
                              handleTableRowChange(index, "value", e.target.value)
                            }
                            placeholder="Giá trị"
                             style={{width: "90%"}}
                            className="input-field compact table-input"
                            disabled={!enableTable}
                          />
                          {tableRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTableRow(index)}
                              disabled={!enableTable}
                              className="btn-compact"
                              style={{
                                position: 'absolute',
                                right: '-35px',
                                top: '40%',
                                transform: 'translateY(-50%)',
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                              title="Xóa dòng này"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop: '8px', fontSize: '12px', color: '#6b7280'}}>
                      💡 Dòng {tableRows.length}/2 | Tối thiểu 1 dòng, tối đa 2 dòng
                    </div>
                  </div>
                </div>

                <div className="form-group buttons-section">
                  <h3 className="buttons-section-title">🔗 Cấu hình nút hành động</h3>
                  
                  {/* Booking Button Section */}
                  <div className="button-config-item">
                    <div className="button-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={enableBookingButton}
                          onChange={(e) => setEnableBookingButton(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">
                        📅 Nút đặt phòng {enableBookingButton ? '(Bật)' : '(Tắt)'}
                      </span>
                    </div>
                    
                    {enableBookingButton && (
                      <div className="button-inputs">
                        <div className="button-input-group">
                          <label className="button-input-label">Tên nút:</label>
                          <input
                            type="text"
                            value={bookingButtonTitle}
                            onChange={(e) => setBookingButtonTitle(e.target.value)}
                            className="input-field compact"
                            placeholder="Đặt phòng ngay"
                            style={{width: "90%"}}
                          />
                        </div>
                        <div className="button-input-group">
                          <label className="button-input-label">Link:</label>
                          <input
                            type="url"
                            value={bookingButtonUrl}
                            onChange={(e) => setBookingButtonUrl(e.target.value)}
                            className="input-field compact"
                             style={{width: "90%"}}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detail Button Section */}
                  <div className="button-config-item">
                    <div className="button-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={enableDetailButton}
                          onChange={(e) => setEnableDetailButton(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">
                        � Nút xem chi tiết {enableDetailButton ? '(Bật)' : '(Tắt)'}
                      </span>
                    </div>
                    
                    {enableDetailButton && (
                      <div className="button-inputs">
                        <div className="button-input-group">
                          <label className="button-input-label">Tên nút:</label>
                          <input
                            type="text"
                             style={{width: "90%"}}
                            value={detailButtonTitle}
                            onChange={(e) => setDetailButtonTitle(e.target.value)}
                            className="input-field compact"
                            placeholder="Xem chi tiết"
                          />
                        </div>
                        <div className="button-input-group">
                          <label className="button-input-label">Link:</label>
                          <input
                            type="url"
                             style={{width: "90%"}}
                            value={detailButtonUrl}
                            onChange={(e) => setDetailButtonUrl(e.target.value)}
                            className="input-field compact"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group footer-section">
                  <div className="button-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={enableFooter}
                        onChange={(e) => setEnableFooter(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">
                      📝 Nội dung chân trang {enableFooter ? '(Bật)' : '(Tắt)'}
                    </span>
                  </div>
                  
                  {enableFooter && (
                    <div className="footer-input">
                      <label className="block form-label">
                        Nội dung chân trang
                      </label>
                      <input
                        type="text"
                         style={{width: "90%"}}
                        value={footerContent}
                        onChange={(e) => setFooterContent(e.target.value)}
                        className="input-field compact"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics about users with complete data */}
              {users.length > 0 && (
                <div className="stats-compact">
                  <h4 className="stats-title">📊 Thống kê dữ liệu:</h4>
                  <div className="stats-grid">
                    <div><strong>Tổng:</strong> {users.length}</div>
                    <div><strong>Đủ data:</strong> {users.filter(u => u.display_name && u.code && u.code.trim()).length}</div>
                    <div><strong>Thiếu code:</strong> {users.filter(u => !u.code || !u.code.trim()).length}</div>
                  </div>
                  {users.filter(u => !u.code || !u.code.trim()).length > 0 && (
                    <p className="stats-warning">
                      ⚠️ Người dùng thiếu code sẽ nhận thông tin từ phần nhập thủ công của code
                    </p>
                  )}
                </div>
              )}

              <div className="message-actions">
                <button
                  onClick={sendMessagesToCustomers}
                  className="btn-primary btn-large"
                >
                  Gửi cho khách hàng
                </button>
                <button
                  onClick={sendMessageToSelf}
                  className="btn-primary btn-small"
                >
                  Gửi cho bạn (Tesst)
                </button>
              </div>

              {messageResponse && (
                <div
                  className="response-container"
                  dangerouslySetInnerHTML={{ __html: messageResponse }}
                />
              )}
            </div>
          )}
          {/* Customer History Tab */}
          {activeTab === "customerHistory" && (
            <div>
              <h2 className="section-header">Lịch sử khách hàng</h2>
              
              {userHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-lg mb-4">Chưa có lịch sử khách hàng nào</p>
                  <p className="text-gray-500 text-sm">Lịch sử sẽ được lưu tự động khi gửi tin nhắn thành công</p>
                </div>
              ) : (
                <div>
                  {/* Compact action buttons */}
                  <div className="history-actions">
                    <button
                      onClick={toggleSelectAllHistory}
                      className="btn-compact btn-secondary-compact"
                    >
                      {selectedHistoryIds.length === userHistory.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <button
                      onClick={deleteSelectedHistory}
                      className="btn-compact btn-danger-compact"
                      disabled={selectedHistoryIds.length === 0}
                    >
                      Xóa đã chọn ({selectedHistoryIds.length})
                    </button>
                    <button
                      onClick={clearAllHistory}
                      className="btn-compact btn-danger-compact"
                    >
                      Xóa tất cả
                    </button>
                    <div className="text-sm text-gray-600">
                      Tổng: {userHistory.length} khách hàng
                    </div>
                  </div>

                  {/* User history table */}
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white rounded-xl shadow-lg">
                      <thead>
                        <tr className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                          <th className="py-4 px-6 text-left font-semibold">
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.length === userHistory.length && userHistory.length > 0}
                              onChange={toggleSelectAllHistory}
                              className="mr-2"
                            />
                            Chọn
                          </th>
                          <th className="py-4 px-6 text-left font-semibold">STT</th>
                          <th className="py-4 px-6 text-left font-semibold">User ID</th>
                          <th className="py-4 px-6 text-left font-semibold">Tên hiển thị</th>
                          <th className="py-4 px-6 text-left font-semibold">Code</th>
                          <th className="py-4 px-6 text-left font-semibold">Thời gian</th>
                          <th className="py-4 px-6 text-left font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userHistory.map((item, index) => (
                          <tr key={item.id} className="hover:bg-green-50 transition-colors duration-200 border-b border-gray-100">
                            <td className="py-3 px-6">
                              <input
                                type="checkbox"
                                checked={selectedHistoryIds.includes(item.id)}
                                onChange={() => toggleHistorySelection(item.id)}
                              />
                            </td>
                            <td className="py-3 px-6 text-gray-700">{index + 1}</td>
                            <td className="py-3 px-6 text-gray-700 font-mono text-sm">{item.user_id}</td>
                            <td className="py-3 px-6 text-gray-700">{item.display_name}</td>
                            <td className="py-3 px-6 text-gray-700">{item.code || <span className="text-gray-400 italic">Không có</span>}</td>
                            <td className="py-3 px-6 text-gray-700 text-sm">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 px-6">
                              <button
                                onClick={() => deleteSingleHistory(item.id)}
                                className="delete-btn"
                                title="Xóa khách hàng này khỏi lịch sử"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
