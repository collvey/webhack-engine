/* NetHack 3.6	sit.c	$NHDT-Date: 1559670609 2019/06/04 17:50:09 $  $NHDT-Branch: NetHack-3.6 $:$NHDT-Revision: 1.61 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

#include "hack.h"
#include "artifact.h"


/* take away the hero's money */
void
take_gold()
{
    struct obj *otmp, *nobj;
    int lost_money = 0;

    for (otmp = invent; otmp; otmp = nobj) {
        nobj = otmp->nobj;
        if (otmp->oclass == COIN_CLASS) {
            lost_money = 1;
            remove_worn_item(otmp, FALSE);
            delobj(otmp);
        }
    }
    if (!lost_money) {
        You_feel(_("a strange sensation."));
    } else {
        You(_("notice you have no money!"));
        context.botl = 1;
    }
}

/* #sit command */
int
dosit()
{
    static const char sit_message[] = "sit on the %s.";
    register struct trap *trap = t_at(u.ux, u.uy);
    register int typ = levl[u.ux][u.uy].typ;

    if (u.usteed) {
        You(_("are already sitting on %s."), mon_nam(u.usteed));
        return 0;
    }
    if (u.uundetected && is_hider(youmonst.data) && u.umonnum != PM_TRAPPER)
        u.uundetected = 0; /* no longer on the ceiling */

    if (!can_reach_floor(FALSE)) {
        if (u.uswallow)
            There(_("are no seats in here!"));
        else if (Levitation)
            You(_("tumble in place."));
        else
            You(_("are sitting on air."));
        return 0;
    } else if (u.ustuck && !sticks(youmonst.data)) {
        /* holding monster is next to hero rather than beneath, but
           hero is in no condition to actually sit at has/her own spot */
        if (humanoid(u.ustuck->data))
            pline(_("%s won't offer %s lap."), Monnam(u.ustuck), mhis(u.ustuck));
        else
            pline(_("%s has no lap."), Monnam(u.ustuck));
        return 0;
    } else if (is_pool(u.ux, u.uy) && !Underwater) { /* water walking */
        goto in_water;
    }

    if (OBJ_AT(u.ux, u.uy)
        /* ensure we're not standing on the precipice */
        && !(uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        register struct obj *obj;

        obj = level.objects[u.ux][u.uy];
        if (youmonst.data->mlet == S_DRAGON && obj->oclass == COIN_CLASS) {
            You(_("coil up around your %shoard."),
                (obj->quan + money_cnt(invent) < u.ulevel * 1000) ? _("meager ")
                                                                  : "");
        } else {
            You(_("sit on %s."), the(xname(obj)));
            if (!(Is_box(obj) || objects[obj->otyp].oc_material == CLOTH))
                pline(_("It's not very comfortable..."));
        }
    } else if (trap != 0 || (u.utrap && (u.utraptype >= TT_LAVA))) {
        if (u.utrap) {
            exercise(A_WIS, FALSE); /* you're getting stuck longer */
            if (u.utraptype == TT_BEARTRAP) {
                You_cant(_("sit down with your %s in the bear trap."),
                         body_part(FOOT));
                u.utrap++;
            } else if (u.utraptype == TT_PIT) {
                if (trap && trap->ttyp == SPIKED_PIT) {
                    You(_("sit down on a spike.  Ouch!"));
                    losehp(Half_physical_damage ? rn2(2) : 1,
                           _("sitting on an iron spike"), KILLED_BY);
                    exercise(A_STR, FALSE);
                } else
                    You(_("sit down in the pit."));
                u.utrap += rn2(5);
            } else if (u.utraptype == TT_WEB) {
                You(_("sit in the spider web and get entangled further!"));
                u.utrap += rn1(10, 5);
            } else if (u.utraptype == TT_LAVA) {
                /* Must have fire resistance or they'd be dead already */
                You(_("sit in the %s!"), hliquid(_("lava")));
                if (Slimed)
                    burn_away_slime();
                u.utrap += rnd(4);
                losehp(d(2, 10), _("sitting in lava"),
                       KILLED_BY); /* lava damage */
            } else if (u.utraptype == TT_INFLOOR
                       || u.utraptype == TT_BURIEDBALL) {
                You_cant(_("maneuver to sit!"));
                u.utrap++;
            }
        } else {
            You(_("sit down."));
            dotrap(trap, VIASITTING);
        }
    } else if ((Underwater || Is_waterlevel(&u.uz))
                && !eggs_in_water(youmonst.data)) {
        if (Is_waterlevel(&u.uz))
            There(_("are no cushions floating nearby."));
        else
            You(_("sit down on the muddy bottom."));
    } else if (is_pool(u.ux, u.uy) && !eggs_in_water(youmonst.data)) {
    in_water:
        You(_("sit in the %s."), hliquid(_("water")));
        if (!rn2(10) && uarm)
            (void) water_damage(uarm, "armor", TRUE);
        if (!rn2(10) && uarmf && uarmf->otyp != WATER_WALKING_BOOTS)
            (void) water_damage(uarm, "armor", TRUE);
    } else if (IS_SINK(typ)) {
        You(_(sit_message), _(defsyms[S_sink].explanation));
        Your(_("%s gets wet."), humanoid(youmonst.data) ? _("rump") : _("underside"));
    } else if (IS_ALTAR(typ)) {
        You(_(sit_message), _(defsyms[S_altar].explanation));
        altar_wrath(u.ux, u.uy);
    } else if (IS_GRAVE(typ)) {
        You(_(sit_message), defsyms[S_grave].explanation);
    } else if (typ == STAIRS) {
        You(_(sit_message), _("stairs"));
    } else if (typ == LADDER) {
        You(_(sit_message), _("ladder"));
    } else if (is_lava(u.ux, u.uy)) {
        /* must be WWalking */
        You(_(sit_message), hliquid(_("lava")));
        burn_away_slime();
        if (likes_lava(youmonst.data)) {
            pline_The(_("%s feels warm."), hliquid(_("lava")));
            return 1;
        }
        pline_The(_("%s burns you!"), hliquid(_("lava")));
        losehp(d((Fire_resistance ? 2 : 10), 10), /* lava damage */
               _("sitting on lava"), KILLED_BY);
    } else if (is_ice(u.ux, u.uy)) {
        You(_(sit_message), defsyms[S_ice].explanation);
        if (!Cold_resistance)
            pline_The(_("ice feels cold."));
    } else if (typ == DRAWBRIDGE_DOWN) {
        You(_(sit_message), _("drawbridge"));
    } else if (IS_THRONE(typ)) {
        You(_(sit_message), defsyms[S_throne].explanation);
        if (rnd(6) > 4) {
            switch (rnd(13)) {
            case 1:
                (void) adjattrib(rn2(A_MAX), -rn1(4, 3), FALSE);
                losehp(rnd(10), _("cursed throne"), KILLED_BY_AN);
                break;
            case 2:
                (void) adjattrib(rn2(A_MAX), 1, FALSE);
                break;
            case 3:
                pline(_("A%s electric shock shoots through your body!"),
                      (Shock_resistance) ? "n" : _(" massive"));
                losehp(Shock_resistance ? rnd(6) : rnd(30), _("electric chair"),
                       KILLED_BY_AN);
                exercise(A_CON, FALSE);
                break;
            case 4:
                You_feel(_("much, much better!"));
                if (Upolyd) {
                    if (u.mh >= (u.mhmax - 5))
                        u.mhmax += 4;
                    u.mh = u.mhmax;
                }
                if (u.uhp >= (u.uhpmax - 5))
                    u.uhpmax += 4;
                u.uhp = u.uhpmax;
                u.ucreamed = 0;
                make_blinded(0L, TRUE);
                make_sick(0L, (char *) 0, FALSE, SICK_ALL);
                heal_legs(0);
                context.botl = 1;
                break;
            case 5:
                take_gold();
                break;
            case 6:
                if (u.uluck + rn2(5) < 0) {
                    You_feel(_("your luck is changing."));
                    change_luck(1);
                } else
                    makewish();
                break;
            case 7:
              {
                int cnt = rnd(10);

                /* Magical voice not affected by deafness */
                pline(_("A voice echoes:"));
                verbalize(_("Thy audience hath been summoned, %s!"),
                          flags.female ? _("Dame") : _("Sire"));
                while (cnt--)
                    (void) makemon(courtmon(), u.ux, u.uy, NO_MM_FLAGS);
                break;
              }
            case 8:
                /* Magical voice not affected by deafness */
                pline(_("A voice echoes:"));
                verbalize(_("By thine Imperious order, %s..."),
                          flags.female ? _("Dame") : _("Sire"));
                do_genocide(5); /* REALLY|ONTHRONE, see do_genocide() */
                break;
            case 9:
                /* Magical voice not affected by deafness */
                pline(_("A voice echoes:"));
                verbalize(
                 _("A curse upon thee for sitting upon this most holy throne!"));
                if (Luck > 0) {
                    make_blinded(Blinded + rn1(100, 250), TRUE);
                    change_luck((Luck > 1) ? -rnd(2) : -1);
                } else
                    rndcurse();
                break;
            case 10:
                if (Luck < 0 || (HSee_invisible & INTRINSIC)) {
                    if (level.flags.nommap) {
                        pline(_("A terrible drone fills your head!"));
                        make_confused((HConfusion & TIMEOUT) + (long) rnd(30),
                                      FALSE);
                    } else {
                        pline(_("An image forms in your mind."));
                        do_mapping();
                    }
                } else {
                    Your(_("vision becomes clear."));
                    HSee_invisible |= FROMOUTSIDE;
                    newsym(u.ux, u.uy);
                }
                break;
            case 11:
                if (Luck < 0) {
                    You_feel(_("threatened."));
                    aggravate();
                } else {
                    You_feel(_("a wrenching sensation."));
                    tele(); /* teleport him */
                }
                break;
            case 12:
                You(_("are granted an insight!"));
                if (invent) {
                    /* rn2(5) agrees w/seffects() */
                    identify_pack(rn2(5), FALSE);
                }
                break;
            case 13:
                Your(_("mind turns into a pretzel!"));
                make_confused((HConfusion & TIMEOUT) + (long) rn1(7, 16),
                              FALSE);
                break;
            default:
                impossible("throne effect");
                break;
            }
        } else {
            if (is_prince(youmonst.data))
                You_feel(_("very comfortable here."));
            else
                You_feel(_("somehow out of place..."));
        }

        if (!rn2(3) && IS_THRONE(levl[u.ux][u.uy].typ)) {
            /* may have teleported */
            levl[u.ux][u.uy].typ = ROOM, levl[u.ux][u.uy].flags = 0;
            pline_The(_("throne vanishes in a puff of logic."));
            newsym(u.ux, u.uy);
        }
    } else if (lays_eggs(youmonst.data)) {
        struct obj *uegg;

        if (!flags.female) {
            pline(_("%s can't lay eggs!"),
                  Hallucination
                      ? _("You may think you are a platypus, but a male still")
                      : _("Males"));
            return 0;
        } else if (u.uhunger < (int) objects[EGG].oc_nutrition) {
            You(_("don't have enough energy to lay an egg."));
            return 0;
        } else if (eggs_in_water(youmonst.data)) {
            if (!(Underwater || Is_waterlevel(&u.uz))) {
                pline(_("A splash tetra you are not."));
                return 0;
            }
            if (Upolyd &&
                (youmonst.data == &mons[PM_GIANT_EEL]
                 || youmonst.data == &mons[PM_ELECTRIC_EEL])) {
                You(_("yearn for the Sargasso Sea."));
                return 0;
            }
        }
        uegg = mksobj(EGG, FALSE, FALSE);
        uegg->spe = 1;
        uegg->quan = 1L;
        uegg->owt = weight(uegg);
        /* this sets hatch timers if appropriate */
        set_corpsenm(uegg, egg_type_from_parent(u.umonnum, FALSE));
        uegg->known = uegg->dknown = 1;
        You(_("%s an egg."), eggs_in_water(youmonst.data) ? _("spawn") : _("lay"));
        dropy(uegg);
        stackobj(uegg);
        morehungry((int) objects[EGG].oc_nutrition);
    } else {
        pline(_("Having fun sitting on the %s?"), surface(u.ux, u.uy));
    }
    return 1;
}

/* curse a few inventory items at random! */
void
rndcurse()
{
    int nobj = 0;
    int cnt, onum;
    struct obj *otmp;
    static const char mal_aura[] = "feel a malignant aura surround %s.";

    if (uwep && (uwep->oartifact == ART_MAGICBANE) && rn2(20)) {
        You(_(mal_aura), _("the magic-absorbing blade"));
        return;
    }

    if (Antimagic) {
        shieldeff(u.ux, u.uy);
        You(_(mal_aura), _("you"));
    }

    for (otmp = invent; otmp; otmp = otmp->nobj) {
        /* gold isn't subject to being cursed or blessed */
        if (otmp->oclass == COIN_CLASS)
            continue;
        nobj++;
    }
    if (nobj) {
        for (cnt = rnd(6 / ((!!Antimagic) + (!!Half_spell_damage) + 1));
             cnt > 0; cnt--) {
            onum = rnd(nobj);
            for (otmp = invent; otmp; otmp = otmp->nobj) {
                /* as above */
                if (otmp->oclass == COIN_CLASS)
                    continue;
                if (--onum == 0)
                    break; /* found the target */
            }
            /* the !otmp case should never happen; picking an already
               cursed item happens--avoid "resists" message in that case */
            if (!otmp || otmp->cursed)
                continue; /* next target */

            if (otmp->oartifact && spec_ability(otmp, SPFX_INTEL)
                && rn2(10) < 8) {
                pline(_("%s!"), Tobjnam(otmp, _("resist")));
                continue;
            }

            if (otmp->blessed)
                unbless(otmp);
            else
                curse(otmp);
        }
        update_inventory();
    }

    /* treat steed's saddle as extended part of hero's inventory */
    if (u.usteed && !rn2(4) && (otmp = which_armor(u.usteed, W_SADDLE)) != 0
        && !otmp->cursed) { /* skip if already cursed */
        if (otmp->blessed)
            unbless(otmp);
        else
            curse(otmp);
        if (!Blind) {
            pline(_("%s %s."), Yobjnam2(otmp, _("glow")),
                  hcolor(otmp->cursed ? NH_BLACK : (const char *) _("brown")));
            otmp->bknown = 1; /* ok to bypass set_bknown() here */
        }
    }
}

/* remove a random INTRINSIC ability */
void
attrcurse()
{
    switch (rnd(11)) {
    case 1:
        if (HFire_resistance & INTRINSIC) {
            HFire_resistance &= ~INTRINSIC;
            You_feel(_("warmer."));
            break;
        }
        /*FALLTHRU*/
    case 2:
        if (HTeleportation & INTRINSIC) {
            HTeleportation &= ~INTRINSIC;
            You_feel(_("less jumpy."));
            break;
        }
        /*FALLTHRU*/
    case 3:
        if (HPoison_resistance & INTRINSIC) {
            HPoison_resistance &= ~INTRINSIC;
            You_feel(_("a little sick!"));
            break;
        }
        /*FALLTHRU*/
    case 4:
        if (HTelepat & INTRINSIC) {
            HTelepat &= ~INTRINSIC;
            if (Blind && !Blind_telepat)
                see_monsters(); /* Can't sense mons anymore! */
            Your(_("senses fail!"));
            break;
        }
        /*FALLTHRU*/
    case 5:
        if (HCold_resistance & INTRINSIC) {
            HCold_resistance &= ~INTRINSIC;
            You_feel(_("cooler."));
            break;
        }
        /*FALLTHRU*/
    case 6:
        if (HInvis & INTRINSIC) {
            HInvis &= ~INTRINSIC;
            You_feel(_("paranoid."));
            break;
        }
        /*FALLTHRU*/
    case 7:
        if (HSee_invisible & INTRINSIC) {
            HSee_invisible &= ~INTRINSIC;
            You(_("%s!"), Hallucination ? _("tawt you taw a puttie tat")
                                     : _("thought you saw something"));
            break;
        }
        /*FALLTHRU*/
    case 8:
        if (HFast & INTRINSIC) {
            HFast &= ~INTRINSIC;
            You_feel(_("slower."));
            break;
        }
        /*FALLTHRU*/
    case 9:
        if (HStealth & INTRINSIC) {
            HStealth &= ~INTRINSIC;
            You_feel(_("clumsy."));
            break;
        }
        /*FALLTHRU*/
    case 10:
        /* intrinsic protection is just disabled, not set back to 0 */
        if (HProtection & INTRINSIC) {
            HProtection &= ~INTRINSIC;
            You_feel(_("vulnerable."));
            break;
        }
        /*FALLTHRU*/
    case 11:
        if (HAggravate_monster & INTRINSIC) {
            HAggravate_monster &= ~INTRINSIC;
            You_feel(_("less attractive."));
            break;
        }
        /*FALLTHRU*/
    default:
        break;
    }
}

/*sit.c*/
