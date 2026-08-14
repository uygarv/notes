import { ForgotPasswordForm } from '@/components/auth/password-reset-forms';
import { isForgotPasswordEnabled } from '@/lib/features';
import { redirect } from 'next/navigation';

export default function ForgotPasswordPage() {
  if (!isForgotPasswordEnabled) redirect('/login');
  return <ForgotPasswordForm />;
}
