import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({edition:vi.fn(),assignment:vi.fn(),categories:vi.fn(),entries:vi.fn(),groups:vi.fn()}));
vi.mock("@/lib/active-edition",()=>({getActiveEdition:m.edition}));
vi.mock("@/lib/db",()=>({prisma:{juryAssignment:{findUnique:m.assignment},category:{findMany:m.categories},entry:{findMany:m.entries},danceGroup:{findMany:m.groups}}}));
import {getVotingChoices} from "./voting-choices";
beforeEach(()=>{vi.resetAllMocks();m.edition.mockResolvedValue({id:"ed"});m.assignment.mockResolvedValue({isActive:true,assignedModule:null});m.categories.mockResolvedValue([{id:"m",name:"Moperita",slug:"moperita"},{id:"n",name:"Ñusta",slug:"nusta"}]);m.entries.mockResolvedValue([]);m.groups.mockResolvedValue([]);});
it("ofrece los tres certámenes a una mesa de ambos módulos",async()=>{const r=await getVotingChoices("j");expect(r.contests.map(c=>c.enabled)).toEqual([true,true,true]);expect(r.selected).toBeNull();expect(m.entries).not.toHaveBeenCalled();});
it.each(["ENTRADA_FOLKLORICA","MOPERITA_NUSTA"])("impide seleccionar un módulo ajeno a %s",async module=>{m.assignment.mockResolvedValue({isActive:true,assignedModule:module});const r=await getVotingChoices("j",module==="ENTRADA_FOLKLORICA"?"m":"danzas");expect(r.selected).toBeNull();expect(m.entries).not.toHaveBeenCalled();expect(m.groups).not.toHaveBeenCalled();});
it.each([null,{isActive:false}])("no permite votar sin asignación activa %j",async a=>{m.assignment.mockResolvedValue(a);const r=await getVotingChoices("j","m");expect(r.contests.every(c=>!c.enabled)).toBe(true);expect(m.entries).not.toHaveBeenCalled();});
it("filtra la categoría, edición, apertura y votos del jurado",async()=>{await getVotingChoices("j","n");expect(m.entries).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({categoryId:"n",category:expect.objectContaining({editionId:"ed"})}),include:expect.objectContaining({scores:{where:{juryId:"j",status:"SUBMITTED"}}})}));});

it("no inventa certámenes cuando no hay edición",async()=>{m.edition.mockResolvedValue(null);expect((await getVotingChoices("j")).contests).toEqual([]);expect(m.assignment).not.toHaveBeenCalled();});
it("agrupa las tres pasadas, conserva foto y distingue sus estados",async()=>{
 const base={participantId:"p",participant:{fullName:"Ana",photoUrl:"/api/images/photo",fraternity:{name:"F"}},category:{status:"OPEN",activeRubricId:"r"},votingOpensAt:null,votingClosesAt:null};
 m.entries.mockResolvedValue([
  {...base,id:"g",status:"CLOSED",runway:{type:"GALA"},scores:[{id:"s"}]},
  {...base,id:"c",status:"IN_SCORING",runway:{type:"CASUAL"},scores:[]},
  {...base,id:"t",status:"PENDING",runway:{type:"TIPICA"},scores:[]},
 ]);
 const r=await getVotingChoices("j","m");expect(r.candidates).toHaveLength(1);expect(r.candidates[0].photoUrl).toBe("/api/images/photo");
 expect(r.candidates[0].rounds.map(x=>x.status)).toEqual(["voted","open","pending"]);
 expect(r.candidates[0].rounds[1].href).toBe("/jurado/calificar/c");expect(r.candidates[0].rounds[0].href).toBeUndefined();expect(r.candidates[0].rounds[0].actaHref).toBe("/jurado/calificar/g");
});
it("no mezcla candidatas con el mismo nombre ni habilita turnos vencidos",async()=>{
 const base={participant:{fullName:"Ana",photoUrl:null,fraternity:{name:"F"}},category:{status:"OPEN",activeRubricId:"r"},status:"IN_SCORING",runway:{type:"GALA"},scores:[]};
 m.entries.mockResolvedValue([{...base,id:"1",participantId:"p1",votingClosesAt:new Date(0)},{...base,id:"2",participantId:"p2",votingOpensAt:new Date(Date.now()+60000)}]);
 const r=await getVotingChoices("j","m");expect(r.candidates).toHaveLength(2);expect(r.candidates[0].rounds[0].status).toBe("closed");expect(r.candidates[1].rounds[0].status).toBe("pending");expect(r.candidates.every(c=>c.rounds.every(x=>!x.href))).toBe(true);
});
