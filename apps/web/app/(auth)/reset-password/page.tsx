import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/password-reset-forms';

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}
