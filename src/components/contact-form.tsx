'use client';
import {useState, type FormEvent} from 'react';
import {ArrowUpLeft} from 'lucide-react';
export function ContactForm({type='contact'}:{type?:'contact'|'careers'|'dealership'}) {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [message,setMessage]=useState('');
  const [notice,setNotice]=useState(false);
  const subject=type==='careers'?'درخواست همکاری':type==='dealership'?'درخواست نمایندگی':'پیام از وبسایت فرامید';
  const submit=(e:FormEvent)=>{
    e.preventDefault();
    const body=`نام: ${name}\nایمیل: ${email}\n\n${message}`;
    window.location.href=`mailto:info@faromid.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setNotice(true);
  };
  return <form className="m-form" onSubmit={submit}>
    <label htmlFor={`${type}-name`}>نام و نام خانوادگی</label>
    <input required id={`${type}-name`} value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما" autoComplete="name"/>
    <label htmlFor={`${type}-email`}>ایمیل</label>
    <input required id={`${type}-email`} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" autoComplete="email"/>
    <label htmlFor={`${type}-message`}>پیام شما</label>
    <textarea required id={`${type}-message`} rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder={type==='careers'?'زمینه تخصصی و راه ارتباطی خود را بنویسید...':type==='dealership'?'شهر و اطلاعات کسب‌وکار را شرح دهید...':'متن پیام...'}/>
    <button className="m-button" type="submit">ارسال از طریق ایمیل <ArrowUpLeft size={17}/></button>
    <p className="m-form-note">{notice?'برنامه ایمیل دستگاه برای ارسال پیام باز شد؛ ارسال نهایی باید در همان برنامه تأیید شود.':'با انتخاب ارسال، برنامه ایمیل دستگاه باز می‌شود. ارسال مستقیم از سرور نیازمند اتصال API است.'}</p>
  </form>;
}
