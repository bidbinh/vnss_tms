'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const r = useRouter();
  const [u, setU] = useState('dieu');
  const [p, setP] = useState('123456');
  const [err, setErr] = useState<string|undefined>();
  const API = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000') + '/api/v1';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(undefined);
    const body = new URLSearchParams({ username: u, password: p });
    const res = await fetch(`${API}/auth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body
    });
    if (!res.ok) { setErr('Sai tài khoản hoặc mật khẩu'); return; }
    const json = await res.json();
    localStorage.setItem('token', json.access_token);
    r.push('/dispatch');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={submit} className="w-full max-w-sm border p-6 rounded-xl space-y-4"
            style={{borderColor:'#663399'}}>
        <h1 className="text-2xl font-bold" style={{color:'#663399'}}>Đăng nhập 9log</h1>
        <input className="border p-2 w-full" placeholder="Tài khoản"
               value={u} onChange={e=>setU(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Mật khẩu" type="password"
               value={p} onChange={e=>setP(e.target.value)} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="w-full py-2 rounded text-white" style={{background:'#663399'}}>Đăng nhập</button>
      </form>
    </main>
  );
}
