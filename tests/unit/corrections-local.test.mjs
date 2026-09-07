import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';

test('dates du spectacle et création de personnes sans structure', { skip: process.env.TADIFF_LOCAL_SUPABASE !== '1', timeout: 180000 }, async () => {
  const url='http://127.0.0.1:54321';
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,url);
  const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const user=(await db.auth.admin.listUsers({perPage:1000})).data.users.find(user=>user.email==='materiel.local@tadiff.test');
  assert(user,'Compte de vérification local absent');
  const profile=await db.from('profiles').select('company_id').eq('id',user.id).single();
  assert.ifError(profile.error);
  const companyId=profile.data.company_id;
  const showId=crypto.randomUUID();
  const otherShowId=crypto.randomUUID();
  const suffix=crypto.randomUUID().slice(0,8);
  const personName='Comédienne test '+suffix;
  const carnetName='Régisseuse test '+suffix;
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  async function insert(table,values){const result=await db.from(table).insert(values).select().single();assert.ifError(result.error);return result.data;}
  try {
    for(const id of [showId,otherShowId]) await insert('shows',{id,company_id:companyId,title:'Spectacle test '+id,discipline:'Théâtre',status:'En pause'});
    const exploitation=await insert('exploitations',{company_id:companyId,show_id:showId,title:'Représentation test '+suffix,exploitation_mode:'corealisation',start_date:'2026-11-15',end_date:'2026-11-15'});
    await insert('exploitation_performances',{company_id:companyId,exploitation_id:exploitation.id,performance_date:'2026-11-15',performance_time:'20:00'});
    await insert('calendar_events',{company_id:companyId,related_show_id:showId,title:'Répétition test '+suffix,event_date:'2026-11-12',kind:'rehearsal',start_time:'14:00',end_time:'17:00',all_day:false});
    await insert('calendar_events',{company_id:companyId,related_show_id:otherShowId,title:'Autre spectacle '+suffix,event_date:'2026-11-12',kind:'rehearsal'});
    await page.goto('http://localhost:3102/login');
    await page.getByLabel('Email',{exact:true}).fill('materiel.local@tadiff.test');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Test-local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();
    await page.waitForURL(/\/dashboard/,{timeout:60000});
    await page.goto('http://localhost:3102/shows/'+showId+'?tab=dates');
    await expect(page.getByText('Représentation test '+suffix,{exact:true})).toBeVisible();
    await expect(page.getByText('Répétition test '+suffix,{exact:true})).toBeVisible();
    await expect(page.getByText('Autre spectacle '+suffix,{exact:true})).toHaveCount(0);
    await page.goto('http://localhost:3102/shows/'+showId+'?tab=team');
    await page.getByRole('button',{name:'Créer une personne',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Nom',{exact:true}).fill(personName);
    await page.getByLabel('Métier / fonction',{exact:true}).fill('Comédienne');
    await page.getByLabel('Rôle interprété (facultatif)',{exact:true}).fill('Juliette');
    await page.getByRole('button',{name:'Créer et ajouter à l’équipe',exact:true}).click();
    await expect(page.getByText(personName,{exact:true})).toBeVisible({timeout:30000});
    const person=await db.from('contacts').select('id,role,status,organization').eq('company_id',companyId).eq('name',personName).single();
    assert.ifError(person.error);assert.equal(person.data.role,'Comédienne');assert.equal(person.data.status,'Partenaire');assert.equal(person.data.organization,'');
    const team=await db.from('show_team_members').select('character_name').eq('show_id',showId).eq('contact_id',person.data.id).single();
    assert.ifError(team.error);assert.equal(team.data.character_name,'Juliette');
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://localhost:3102/contacts/new');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Le formulaire déborde sur mobile');
    await page.getByLabel('Nom',{exact:true}).fill(carnetName);
    await page.getByLabel('Métier / fonction',{exact:true}).fill('Régie');
    await page.getByRole('checkbox',{name:'Personne de l’équipe artistique, technique ou de production'}).check();
    await page.getByRole('button',{name:'Créer le contact',exact:true}).click();
    await page.waitForURL(/\/contacts$/,{timeout:30000});
    const carnet=await db.from('contacts').select('status,role').eq('company_id',companyId).eq('name',carnetName).single();
    assert.ifError(carnet.error);assert.equal(carnet.data.status,'Partenaire');
  } finally {
    await browser.close();
    for (const id of [showId,otherShowId]) { await db.from('calendar_events').delete().eq('related_show_id',id).eq('company_id',companyId); await db.from('shows').delete().eq('id',id).eq('company_id',companyId); }
    await db.from('contacts').delete().eq('company_id',companyId).in('name',[personName,carnetName]);
  }
});
