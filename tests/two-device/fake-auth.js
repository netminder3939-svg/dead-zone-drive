// Fake firebase-auth for local two-device tests. The signed-in user is kept in this browser's localStorage.
const BASE=new URL('.',import.meta.url).href.replace(/\/$/,'');
const KEY='__fakeAuthUser';
const A=globalThis.__fakeAuth||(globalThis.__fakeAuth={currentUser:null});
try{const u=JSON.parse(localStorage.getItem(KEY)||'null');if(u)A.currentUser=mk(u);}catch(e){}
function mk(u){return{uid:u.uid,email:u.email||null,isAnonymous:!!u.isAnonymous,getIdToken:async()=>'fake',providerData:[]};}
async function post(body){const r=await fetch(BASE+'/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.code),{code:j.code});return j;}
function setUser(u){A.currentUser=u?mk(u):null;try{u?localStorage.setItem(KEY,JSON.stringify(u)):localStorage.removeItem(KEY);}catch(e){}return A.currentUser;}
export const browserLocalPersistence={};export function connectAuthEmulator(){}
export function getAuth(){A.authStateReady=async()=>{};return A;}
export async function setPersistence(){}
export async function signInAnonymously(){return{user:setUser(await post({mode:'anon'}))};}
export async function signInWithEmailAndPassword(a,email,pass){return{user:setUser(await post({mode:'signin',email,pass}))};}
export async function createUserWithEmailAndPassword(a,email,pass){return{user:setUser(await post({mode:'signup',email,pass}))};}
export async function sendPasswordResetEmail(){}
export async function signOut(){setUser(null);}
export function onAuthStateChanged(a,f){setTimeout(()=>f(A.currentUser),0);return()=>{};}
