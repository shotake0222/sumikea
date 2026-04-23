import ProfileForm from './ProfileForm';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12" style={{ lineHeight: '1.25' }}>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-black mb-8 tracking-tighter text-slate-800">Settings</h1>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Edit Profile</h2>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}