import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Peso — Your everyday money, clearly', description:'Track your personal and business money in Philippine pesos.', manifest:'/manifest.webmanifest', icons:{icon:'/icon-192.png',apple:'/icon-192.png'}, appleWebApp:{capable:true,statusBarStyle:'default',title:'Peso'} };
export const viewport = {width:'device-width',initialScale:1,themeColor:'#38674e',viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
