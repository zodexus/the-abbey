'use client';
import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import EquipmentApp from './equipment-app';
import type { EquipmentRole } from '@/lib/equipment';
type Session={name:string;userId:number;equipmentRole:EquipmentRole};
export default function EquipmentLauncher() {
 const [session,setSession]=useState<Session|null>(null);
 const [demo,setDemo]=useState(false);
 const [error,setError]=useState('');
 const api=useCallback(async(path:string,method='GET',body?:unknown)=>{
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json','x-telegram-init-data':window.Telegram?.WebApp.initData||''},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Could not connect. Please try again.');
  return data;
 },[]);
 const connect=useCallback(async()=>{
  const app=window.Telegram?.WebApp;
  if(!app?.initData)return;
  app.ready();app.expand();
  try{setSession(await api('/api/session?equipment=1'));}catch(e){setError((e as Error).message);}
 },[api]);
 useEffect(()=>{void connect();},[connect]);
 return <><Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={()=>{void connect();}}/>
  <main className="shell equipment-shell"><header className="header"><h1><span aria-hidden="true">🎶</span> abbey equipment 26/27</h1></header>
   {session?<EquipmentApp session={session} api={api} demo={demo}/>:<section className="welcome"><a className="primary" href="https://t.me/TheAbbeyBot">Open in Telegram</a><p>Equipment loans for Abbey-licensed residents.</p>{error&&<p className="error" role="alert">{error}</p>}<button className="subtle" onClick={()=>{setDemo(true);setSession({name:'Alex',userId:1,equipmentRole:'owner'});}}>Preview</button></section>}
  </main>
 </>;
}
