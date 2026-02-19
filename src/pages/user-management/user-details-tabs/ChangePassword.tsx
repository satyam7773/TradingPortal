import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Key, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../../../components/ui/Input';
import { apiClient } from '../../../services/apiClient';

interface ChangePasswordProps {
  user: any
  userDetails: any
  onClose?: () => void
  onRefresh?: (targetUser?: any) => Promise<any>
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ user, userDetails, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 mb-6 border-2 border-purple-200 dark:border-slate-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Change Password</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 ml-13">
            Update the password for <span className="font-semibold">{userDetails?.name || user?.name}</span> ({userDetails?.username || user?.username})
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <Formik
            initialValues={{ masterPassword: '', newPassword: '' }}
            validationSchema={Yup.object({
              masterPassword: Yup.string().required('Master password is required'),
              newPassword: Yup.string()
                .min(6, 'New password must be at least 6 characters')
                .required('New password is required')
            })}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              try {
                setLoading(true);
                setErrorMessage('');
                const targetUserId = userDetails?.userId || user?.id || user?.userId;
                const currentUserStr = localStorage.getItem('userData');
                const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
                const actingUserId = currentUser?.userId;
                
                if (!actingUserId || !targetUserId) {
                  toast.error('User ID not available');
                  return;
                }

                const payload = {
                  requestTimestamp: '',
                  userId: Number(actingUserId),
                  data: {
                    updateUserId: Number(targetUserId),
                    masterPassword: values.masterPassword,
                    newPassword: values.newPassword
                  }
                };

                console.log('🔐 Forgot Password Request:', {
                  endpoint: '/user/portal/forgotPassword',
                  userId: payload.userId,
                  updateUserId: payload.data.updateUserId
                });

                const response = await apiClient.post('/user/portal/forgotPassword', payload);

                const code = String(response?.responseCode ?? response?.data?.responseCode ?? '');
                const message = response?.responseMessage || response?.data?.responseMessage || 'Password updated successfully';

                if (code === '0' || code === '1000') {
                  toast.success(message);
                  resetForm();
                  setErrorMessage('');
                  if (onRefresh) {
                    try {
                      await onRefresh(user);
                    } catch (err) {
                      console.warn('Failed to refresh after password change', err);
                    }
                  }
                } else {
                  setErrorMessage(message || 'Failed to change password');
                  toast.error(message || 'Failed to change password');
                }
              } catch (error: any) {
                console.error('Change password error:', error);
                const errorMsg = error?.response?.data?.responseMessage || error?.message || 'Failed to change password';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
              } finally {
                setLoading(false);
                setSubmitting(false);
              }
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, dirty }) => (
              <Form onSubmit={handleSubmit} className="space-y-5">
                {/* Master Password */}
                <div>
                  <Input
                    label="Master Password*"
                    icon={Key}
                    name="masterPassword"
                    type="password"
                    placeholder="Enter master password"
                    value={values.masterPassword || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.masterPassword && errors.masterPassword ? errors.masterPassword : ''}
                    showPasswordToggle
                  />
                </div>

                {/* New Password */}
                <div>
                  <Input
                    label="New Password*"
                    icon={Lock}
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={values.newPassword || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.newPassword && errors.newPassword ? errors.newPassword : ''}
                    showPasswordToggle
                  />
                </div>

                {/* Password Requirements Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Password Requirements</p>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Minimum 6 characters</li>
                        <li>• Use master password to authorize change</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !isValid || !dirty}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:via-pink-600 disabled:hover:to-red-600"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
