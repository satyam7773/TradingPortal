import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import UserDetailsModal from './UserDetailsModal';

interface UserNode {
  id: number;
  name: string;
  username?: string;
  roleId?: number;
  roleName?: string;
  parentId: number;
  children: UserNode[];
}

interface TreeNodeProps {
  node: UserNode;
  level: number;
  searchTerm: string;
  onUserDoubleClick: (userId: number) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, searchTerm, onUserDoubleClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasChildren = node.children && node.children.length > 0;
  const userType = hasChildren || node.roleId === 3 ? 'MASTER' : 'CLIENT';
  
  const displayName = node.username || node.name;
  const matchesSearch = !searchTerm || 
    displayName.toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch && !hasChildren) return null;

  return (
    <div>
      <div
        className="flex items-center py-2 px-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 p-0.5 hover:bg-blue-100 dark:hover:bg-slate-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-6 mr-2" />
        )}
        
        <span
          onDoubleClick={() => onUserDoubleClick(node.id)}
          className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer"
        >
          {displayName} {node.roleName && <span className="text-gray-500 dark:text-gray-400">({node.roleName.toUpperCase()})</span>}
        </span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              searchTerm={searchTerm}
              onUserDoubleClick={onUserDoubleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SearchUser: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTree, setUserTree] = useState<UserNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [modalUser, setModalUser] = useState<any>(null);
  const [treeKey, setTreeKey] = useState(0);

  const fetchUserTree = async () => {
    setLoading(true);
    setError(null);
    
    try {
        const userDataStr = localStorage.getItem('userData');
        if (!userDataStr) {
          throw new Error('User data not found');
        }
        
        const userData = JSON.parse(userDataStr);
        const userId = userData.userId;
        
        console.log('🔍 Fetching user tree for userId:', userId);
        
        const response = await apiClient.get(`/user/fetchUserTree?userId=${userId}`);
        
        console.log('📦 API Response:', response.data);
        
        // Check both possible response structures
        const userList = response.data?.data?.userList || response.data?.userList;
        
        if (userList && Array.isArray(userList)) {
          console.log('📊 Root nodes received:', userList.length);
          console.log('👤 Root users:', userList.map((n: UserNode) => ({ id: n.id, name: n.name, childrenCount: n.children?.length })));
          
          // Always show the full tree structure, including root node
          console.log('✅ Showing full tree structure');
          setUserTree(userList);
        } else {
          console.log('❌ No userList in response');
          setUserTree([]);
        }
      } catch (err: any) {
        console.error('Error fetching user tree:', err);
        setError(err.message || 'Failed to fetch user tree');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchUserTree();
  }, []);

  const handleUserDoubleClick = (userId: number) => {
    setSelectedUserId(userId);
    // Create a minimal user object for the modal
    setModalUser({
      id: userId.toString(),
      username: '',
      name: '',
      type: 'Client' as const,
      parent: '',
      credit: 0,
      balance: 0,
      sharing: null,
      bet: false,
      closeOut: false,
      margin: false,
      status: true,
      creditLimit: false,
      creditBasedMargin: false,
      betEnabled: true,
      closeOutEnabled: true,
      marginEnabled: true,
      statusEnabled: true,
      creditLimitEnabled: true,
      creditBasedMarginEnabled: true,
      createdDate: '',
      ipAddress: '',
      deviceId: '',
      lastLogin: ''
    });
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
    setModalUser(null);
  };

  const handleToggle = () => {
    // Handle toggle if needed
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCloseAll = () => {
    // Force re-render of all tree nodes to reset their isExpanded state
    setTreeKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Search User</h1>
          <button
            onClick={handleCloseAll}
            className="text-white hover:bg-blue-500 dark:hover:bg-blue-600 rounded p-1 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* User Tree */}
        <div className="max-h-[600px] overflow-y-auto bg-white dark:bg-slate-800 rounded-b-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : userTree.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="py-2" key={treeKey}>
              {userTree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  searchTerm={searchTerm}
                  onUserDoubleClick={handleUserDoubleClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {modalUser && (
        <UserDetailsModal
          user={modalUser}
          onClose={handleCloseModal}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
};

export default SearchUser;
