// v20 Team sync: the horde is simulated by whichever phone is open, then shared (meta/horde). Before, its strength used THAT
// phone's player level and THAT phone's home troops, so the horde got weaker or stronger depending on who opened the app.
// Now it uses crew-wide numbers every phone can see in the member docs: the average level of active members and the average
// home troop power. Same inputs on every phone = the same world.
const TEAM={activeDays:7};
HOOK.member(function(o){try{if(P.world&&typeof TP==='function')o.troopPow=Math.round(TP().home*TROOP.powerPer);}catch(e){}return o;});
function activeMembers(){const now=Date.now(),mem=(G.al&&G.al.members)||{},out=[];for(const [uid,m] of Object.entries(mem)){const la=m.lastActive||0;if(m.me||isMe(uid))continue;if(!la||now-la<TEAM.activeDays*864e5)out.push(m);}
  out.push({lvl:P.lvl,troopPow:(typeof TP==='function'?Math.round(TP().home*TROOP.powerPer):0)});return out;}
function teamLevel(){const a=activeMembers();return Math.max(1,Math.round(a.reduce((s,m)=>s+(m.lvl||1),0)/a.length));}
function teamTroopPow(){const a=activeMembers();return Math.round(a.reduce((s,m)=>s+(m.troopPow||0),0)/a.length);}
// factionStr: swap your own level for the crew's average level
factionStr=function(f){const B=BAL.factions,days=f.since?Math.min(30,(Date.now()-f.since)/864e5):0;
  return Math.round((B.base+B.perLevel*teamLevel()+B.perMember*(allianceSize()-1)+B.perDay*days+landStr())*Math.pow(B.tierMult,f.tier||0));};
// troops part of landStr: crew average home troop power instead of yours
if(typeof TR2!=='undefined'){landStr=function(){return Math.round(BAL.land.strPerSqrtHex*Math.sqrt(teamHexes()))+Math.round(TR2.hordeTroopShare*teamTroopPow());};}
