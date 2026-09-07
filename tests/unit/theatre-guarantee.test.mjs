import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCompanyRevenue, resolveStoredCompanyRevenue } from '../../lib/pipeline.ts';
import { getPerformanceContribution } from '../../lib/exploitation-finance.ts';
import { calculateShowBudget, defaultShowBudgetProfile } from '../../lib/show-budget.ts';
import { contactSchema } from '../../lib/validation/contact.ts';

const revenue = (gross, share, minimum) => calculateCompanyRevenue({ exploitationMode:'corealisation', estimatedBoxOffice:gross, companySharePercent:share, minimumGuarantee:minimum, venueRental:0, cessionFee:0 });
test('le minimum garanti revient au théâtre, y compris si la compagnie doit compléter', () => {
  assert.equal(revenue(1000,70,150),700);
  assert.equal(revenue(200,70,150),50);
  assert.equal(revenue(50,70,150),-100);
  assert.equal(revenue(0,70,150),-150);
});
test('le simulateur budget utilise la même règle', () => {
  const profile={...structuredClone(defaultShowBudgetProfile),exploitationMode:'revenue_share',venueCapacity:10,expectedOccupancyPercent:100,averageTicketPrice:5,companySharePercent:70,minimumGuarantee:150};
  assert.equal(calculateShowBudget(profile,[]).performanceIncome,-100);
});
test('recalcule les anciennes propositions et multiplie le minimum par les dates', () => {
  assert.equal(resolveStoredCompanyRevenue({exploitation_mode:'corealisation',value:999,estimated_box_office:200,company_share_percent:70,minimum_guarantee:150,minimum_guarantee_basis:'per_performance',performance_dates:['2026-11-15','2026-11-16']}),-100);
  assert.equal(calculateCompanyRevenue({exploitationMode:'corealisation',estimatedBoxOffice:200,companySharePercent:70,minimumGuarantee:150,minimumGuaranteeBasis:'per_performance',performanceDates:['2026-11-15','2026-11-16'],cessionFee:0,venueRental:0}),-100);
});
test('le minimum global n’est pas appliqué séparément aux soirées', () => {
  const performances=[{status:'programmee',grossBoxOffice:1000,ticketingFees:0,variableCosts:0},{status:'programmee',grossBoxOffice:0,ticketingFees:0,variableCosts:0},{status:'annulee',grossBoxOffice:5000,ticketingFees:0,variableCosts:0}];
  const exploitation={exploitationMode:'corealisation',minimumGuarantee:400,minimumGuaranteeBasis:'total',companySharePercent:70,performances};
  assert.equal(performances.reduce((sum,p)=>sum+getPerformanceContribution(exploitation,p),0),600);
  exploitation.minimumGuaranteeBasis='per_performance';
  assert.equal(performances.reduce((sum,p)=>sum+getPerformanceContribution(exploitation,p),0),200);
});
test('une personne de l’équipe peut être indépendante et sans email', () => {
  assert.equal(contactSchema.safeParse({contactType:'person',name:'Camille Martin',organization:'',role:'Comédienne',email:'',status:'Partenaire',tags:['Équipe']}).success,true);
});
