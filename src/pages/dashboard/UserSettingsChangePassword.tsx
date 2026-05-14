import React, { useState, useMemo } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Key, Lock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../services';
import Input from '../../components/ui/Input';

interface ChangePasswordValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserSettingsChangePassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validationSchema = useMemo(() => Yup.object({
    oldPassword: Yup.string().required('Current password is required'),
    newPassword: Yup.string()
      .min(6, 'New password must be at least 6 characters')
      .notOneOf([Yup.ref('oldPassword')], 'New password cannot be the same as old password')
      .required('New password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Passwords must match')
      .required('Please confirm your new password'),
  }), []);

  const handleSubmit = async (values: ChangePasswordValues, { resetForm }: FormikHelpers<ChangePasswordValues>) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const userDataStr = localStorage.getItem('userData');
      const currentUser = userDataStr ? JSON.parse(userDataStr) : null;
      const userId = currentUser?.userId;

      if (!userId) {
        toast.error('Session expired. Please login again.');
        return;
      }

      const payload = {
        requestTimestamp: String(Date.now()),
        userId: Number(userId),
        data: {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        }
      };

      const response = await apiClient.post('/user/settings/changePassword', payload);
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        toast.success('Password updated successfully!');
        resetForm();
      } else {
        setErrorMessage(response?.responseMessage || 'Update failed');
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.responseMessage || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Changed min-h-screen to h-full and added overflow-y-auto */
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
      <div className="max-w-xl mx-auto p-4 md:p-6">
        
        {/* Compact Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-5 mb-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Security Settings</h1>
              <p className="text-blue-100/80 text-[11px]">Update your account credentials</p>
            </div>
          </div>
        </div>

        {/* Form Card - Reduced Padding */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-md font-bold text-slate-800 dark:text-slate-100">Update Password</h2>
          </div>

          <Formik
            initialValues={{ oldPassword: '', newPassword: '', confirmPassword: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, isValid, dirty }) => (
              <Form className="space-y-4">
                
                <Input
                  label="Current Password"
                  icon={Key}
                  name="oldPassword"
                  type="password"
                  placeholder="••••••••"
                  value={values.oldPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.oldPassword && errors.oldPassword ? errors.oldPassword : ''}
                  showPasswordToggle
                  className="bg-slate-50/50 dark:bg-slate-800/50"
                />

                <div className="space-y-4 pt-2">
                  <Input
                    label="New Password"
                    icon={Lock}
                    name="newPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={values.newPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.newPassword && errors.newPassword ? errors.newPassword : ''}
                    showPasswordToggle
                    className="bg-slate-50/50 dark:bg-slate-800/50"
                  />

                  <Input
                    label="Confirm Password"
                    icon={ShieldCheck}
                    name="confirmPassword"
                    type="password"
                    placeholder="Repeat new password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : ''}
                    showPasswordToggle
                    className="bg-slate-50/50 dark:bg-slate-800/50"
                  />
                </div>

                {/* Compact Info Box */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 flex gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 leading-tight">
                    Use a strong password with a mix of letters and numbers for better security.
                  </p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Action - Always visible because of parent scrolling */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isValid || !dirty}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsChangePassword;