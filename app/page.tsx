import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
import Tracker from './tracker';
export const dynamic = 'force-dynamic';
export default async function Page(){const user=await getChatGPTUser();if(user)return <Tracker name={user.displayName}/>;return <main className="welcome"><a className="brand" href="/"><span className="brand-mark">₱</span>peso.</a><span className="eyebrow">PERSONAL LIFE. BUSINESS GOALS.</span><h1>A little clarity.<br/>A lot more peace of mind.</h1><p>Your cash, cards, budgets, and business bills.<br/>One calm place to bring it all together.</p><a className="button primary" href={chatGPTSignInPath('/')} target="_top">Sign in with ChatGPT <span aria-hidden="true">→</span></a><small>Your workspace is private. No bank connection needed.</small></main>;}
