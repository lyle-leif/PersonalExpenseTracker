// Visual references only. Product names describe artwork, never account ownership or eligibility.
const reviewedAt='2026-10-29';
const rows=[
 ['cibc','CIBC Advantage Debit','https://www.cibc.com/en/personal-banking/ways-to-bank/ways-to-pay.html','CIBC Dividend Visa','https://www.cibc.com/en/personal-banking/credit-cards/all-credit-cards/dividend-visa-card.html','diamond','#831537','#dfc074'],
 ['td','TD Access Card','https://www.td.com/ca/en/personal-banking/ways-to-bank/ways-to-pay/visa-debit-card','TD Cash Back Visa','https://www.td.com/ca/en/personal-banking/products/credit-cards/cash-back/cash-back-visa-card','ribbon','#00643c','#a3d88f'],
 ['scotiabank','Scene+ ScotiaCard','https://www.scotiabank.com/ca/en/personal/programs-services/sceneplus-rewards/cards.html','Scene+ Visa','https://www.scotiabank.com/ca/en/personal/credit-cards/visa/scene-card.html','orb','#be1235','#fd657b'],
 ['rbc','RBC Client Card','https://www.rbcroyalbank.com/banking-services/debit-card.html','RBC Cash Back Mastercard','https://www.rbcroyalbank.com/credit-cards/cash-back/rbc-cashback-mastercard.html','crest','#0555a0','#edc25c'],
 ['bmo','BMO Debit Card','https://www.bmo.com/en-ca/main/personal/ways-to-bank/debit-cards/','BMO CashBack Mastercard','https://www.bmo.com/main/personal/credit-cards/bmo-cashback-mastercard/','horizon','#0662a5','#fc5361'],
 ['tangerine','Tangerine Client Card','https://www.tangerine.ca/en/faq/what-are-the-ways-i-can-use-my-client-card','Tangerine Money-Back Credit Card','https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card','citrus','#c44a08','#ffcf93'],
 ['simplii','Simplii Debit Mastercard','https://www.simplii.com/en/bank-accounts/no-fee-chequing.html','Simplii Cash Back Visa','https://www.simplii.com/en/credit-cards/cash-back-visa.html','blocks','#263a31','#d5f46c'],
 ['nationalbank','National Bank Debit Card','https://www.nbc.ca/personal/accounts/services/debit-card.html','mycredit Mastercard','https://www.nbc.ca/personal/mastercard-credit-cards/my-credit.html','diagonal','#a41f36','#faafb9'],
 ['desjardins','Desjardins Access Card','https://www.desjardins.com/ca/FAQ/index.jsp?categorieId=29%2F1000&sectionId=6&sousCategorieId=98','Cash Back Mastercard','https://www.desjardins.com/en/credit-cards/cash-back-mastercard.html','hexagon','#006a4c','#a0e4b9'],
 ['eqbank','EQ Bank Card · prepaid','https://www.eqbank.ca/personal-banking/payments/card/1000',null,null,'sunrise','#273c48','#f1cb52'],
 ['wealthsimple','Visa Platinum prepaid card','https://www.wealthsimple.com/en-ca/visa-platinum-prepaid-card','Wealthsimple Credit Card','https://www.wealthsimple.com/en-ca/wealthsimple-credit-card','contour','#313734','#d9d0b6'],
 ['pcfinancial','PC Money Account card · prepaid','https://www.pcfinancial.ca/api/v2/en-CA/assets/pcma_account_agreement_v3.pdf','PC Mastercard','https://www.pcfinancial.ca/en/credit-cards/','tiles','#a31931','#ffc4a5'],
 ['amexcanada',null,null,'SimplyCash Card','https://www.americanexpress.com/en-ca/credit-cards/simply-cash/','guilloche','#0a4b83','#9bd1eb'],
 ['bpi','BPI Debit Mastercard','https://www.bpi.com.ph/personal/cards/debit-cards/online-debit-card-request','BPI Rewards Card','https://www.bpi.com.ph/personal/cards/credit-cards/bpi-blue-mastercard','sweep','#901934','#e5bc67'],
 ['maribank','MariBank Debit Card','https://www.maribank.ph/product/debit-card','Mari Credit Card','https://www.maribank.ph/product/mari-credit-card','tide','#c34a17','#ffd5aa'],
 ['bdo','BDO Debit Mastercard','https://www.bdo.com.ph/personal/cards/debit-card/faqs','BDO Standard Mastercard','https://www.bdo.com.ph/personal/cards/credit-cards/mastercard/standard','weave','#07458b','#efca61'],
 ['metrobank','Metrobank Debit Card','https://www.metrobank.com.ph/personal/cards/debit-cards','M Free Mastercard','https://www.metrobank.com.ph/personal/cards/credit-cards/mfree','prism','#073c8d','#62b3f0'],
 ['unionbank','UnionBank Debit Card','https://www.unionbankph.com/cards/debit-card?id=56','UnionBank Classic Visa','https://www.unionbankph.com/cards/credit-card','orbit','#bd4517','#ffd4ab'],
 ['rcbc','RCBC MyDebit Mastercard','https://www.rcbc.com/mydebit','RCBC Flex Visa','https://rcbccredit.com/credit-cards/gold-and-classic-cards/flex-visa','fold','#075795','#a3d4f2'],
 ['securitybank','Security Bank Debit Mastercard','https://www.securitybank.com/personal/accounts/debit-card/', 'Wave Mastercard','https://www.securitybank.com/news/security-bank-launches-new-sustainable-no-annual-fee-wave-mastercard-credit-card/','wave','#065345','#a1d9c4'],
 ['eastwest','EastWest Visa Debit','https://www.eastwestbanker.com/cards/debit-cards','EveryDay Titanium Mastercard','https://www.eastwestbanker.com/creditcards/everyday-titanium-mastercard','petals','#62376c','#e9a2cb'],
 ['pnb','PNB Debit Mastercard','https://www.pnb.com.ph/card/', 'PNB Ze-Lo Mastercard','https://www.pnb.com.ph/storage/asset-libraries/lO03OLDD2xAIDJESnf0akcX7anB9fJwp1HYfxAkX.pdf','grid','#174f89','#89c3e7'],
 ['maya','Maya Card','https://www.maya.ph/pay-maya-card','Landers Cashback Everywhere','https://www.mayabank.ph/creditcard/landers/','signal','#123e31','#b2e474'],
 ['gcash','GCash Card','https://help.gcash.com/hc/en-us/articles/21907534783769-GCash-Card-FAQs',null,null,'ripple','#1255c8','#89c4ff'],
 ['gotyme','GoTyme Visa Debit','https://www.gotyme.com.ph/help/visa-debit-card/physical-debit-card/paying-with-your-debit-card/',null,null,'arches','#075b69','#a0e0dd'],
 ['cimb','Fast Plus physical debit · existing cards','https://www.cimbbank.com.ph/en/help-and-support/customer-advisories/2026/update-on-fast-plus-physical-cards.html',null,null,'chevron','#901a31','#ffb4b9'],
 ['tonik','Tonik Physical Debit Card','https://tonikbank.com/faq/cards',null,null,'bubbles','#60368a','#dfb7fb'],
 ['other',null,null,null,null,'linen','#344c43','#bedacc']
];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45);
export const CARD_DESIGNS=Object.freeze(rows.flatMap(([providerId,balance,balanceSource,credit,creditSource,pattern,background,accent])=>['balance','credit'].flatMap(role=>{
 const name=role==='credit'?credit:balance,sourceUrl=role==='credit'?creditSource:balanceSource;
 const original={id:providerId+'-'+role,providerId,role,name:'Monix original',referenceKind:'original',sourceUrl:null,reviewedAt,pattern,background,accent};
 const creditFinish=role==='credit'?({rbc:{background:'#86a5b6',ink:'#133046',pattern:'microtriangle',accent:'#e5edf1'},bpi:{background:'#18204b',pattern:'orbit',accent:'#93b8d1'},bmo:{pattern:'prism'},eastwest:{background:'#53515a'}}[providerId]||{}):{};
 return [Object.freeze(original),...(name?[Object.freeze({...original,id:providerId+'-'+slug(name)+'-'+role,name,sourceUrl,referenceKind:'product',background:role==='credit'&&['scotiabank','wealthsimple','maya'].includes(providerId)?'#242a29':background,...creditFinish})]:[])];
})));
export const cardDesign=id=>CARD_DESIGNS.find(d=>d.id===id)||null;
export const designsForAccount=(providerId,kind)=>CARD_DESIGNS.filter(d=>d.providerId===providerId&&d.role===(kind==='credit'?'credit':'balance'));
export const referenceDesign=(providerId,kind)=>designsForAccount(providerId,kind).find(d=>d.referenceKind==='product')||designsForAccount(providerId,kind)[0]||null;
export function withCardDesign(account,styleId){const design=cardDesign(styleId);if(!design||design.providerId!==account.providerId||design.role!==(account.kind==='credit'?'credit':'balance'))throw Error('Choose a compatible design for this provider and account type.');return {...structuredClone(account),cardStyleId:styleId};}
