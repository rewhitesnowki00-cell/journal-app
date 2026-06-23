"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const supabase = createClient();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { setError(error.message); return; }
        setMessage("確認メールを送りました。メールのリンクをクリックしてください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError("メールアドレスかパスワードが間違っています"); return; }
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mb-2 text-4xl">📋</div>
          <h1 className="text-xl font-semibold">日誌・タスク管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">会話とタスクをまとめて記録</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">パスワード</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="6文字以上" minLength={6} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button type="submit" disabled={isPending}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {isPending ? "処理中…" : isSignUp ? "アカウント作成" : "ログイン"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
          {" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
            className="text-indigo-600 underline">
            {isSignUp ? "ログイン" : "新規登録"}
          </button>
        </p>
      </div>
    </div>
  );
}
