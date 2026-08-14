import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/password-reset-forms';
import { isForgotPasswordEnabled } from '@/lib/features';

export default function ResetPasswordPage() {
  if (!isForgotPasswordEnabled) redirect('/login');
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
