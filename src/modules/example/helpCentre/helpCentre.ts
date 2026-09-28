import { LightningElement } from 'lwc';

/**
 * The employer landing page, modelled on MSD's own
 * https://new.my.msd.govt.nz/en/jobs/for-employers.html — the first five
 * content sections of it: hero, service intro, the three-step card row, and two
 * media splits.
 *
 * The copy below is transcribed verbatim from that page. It is page content,
 * not application data, so it lives here as constants rather than in the
 * database; nothing on this screen is derived from a record, so there is no
 * `/api` call and nothing to degrade in the static build.
 *
 * The page owns the content and passes it down; each section is a widget in
 * `src/modules/ui/` that an administrator could drop into a region on its own.
 */

const HERO = {
    heading: 'Grow your team with the right talent',
    body: 'We help you find the best people for your needs and industry — simple, smart and free.',
    ctaLabel: 'List a job',
    ctaHref: '/create-job/step1',
    iconName: 'standard:people'
};

const INTRO = {
    heading: 'We’re more than just a recruitment service',
    paragraphs: [
        {
            key: 'p1',
            text:
                "Tap into New Zealand's largest talent pool of jobseekers. We combine local " +
                'know-how, advanced smart matching, and labour market expertise to connect you ' +
                'with the best people for your needs.'
        },
        {
            key: 'p2',
            text:
                'Our candidates range from experienced and skilled professionals to motivated ' +
                'and eager individuals who are ready to learn. We may be able to provide support ' +
                'to candidates requiring extra help to move into mahi.'
        }
    ]
};

const HOW_IT_WORKS = {
    heading: 'Simple, smart and free',
    intro:
        'We take the hard work out of recruiting and our service is completely free. Our experts ' +
        'match you with the right candidates, give you a shortlist of people to choose from and ' +
        'can support you through the hiring process.',
    cards: [
        {
            key: 'list',
            iconName: 'standard:form',
            title: 'List your job vacancy with us online',
            body: 'Use our simple online form to list your vacancy with us.'
        },
        {
            key: 'match',
            iconName: 'standard:groups',
            title: 'Talent matched to your needs',
            body:
                'We compare your requirements to our nationwide talent pool, and find the right ' +
                'people for your team.'
        },
        {
            key: 'support',
            iconName: 'standard:coaching',
            title: 'Get the support you need',
            // "chose" is the source page's own typo, kept so the copy stays a
            // faithful transcription rather than a silent edit.
            body:
                'We give you a shortlist of people to chose from, and help with hiring and ' +
                'onboarding if you need it.'
        }
    ],
    linkLabel: 'How it works',
    linkHref: '/how-it-works'
};

const PARTNER = {
    heading: 'We’re a partner in your team’s success',
    intro: 'Our comprehensive recruitment service includes:',
    items: [
        {
            key: 'tailored',
            text: 'tailored support to recruit the right people for your business needs and industry'
        },
        {
            key: 'matching',
            text: 'smart matching to local talent with the skills and certifications you need'
        },
        {
            key: 'insights',
            text: 'insights into local labour market and wider employment trends.'
        }
    ],
    linkLabel: 'Why recruit with us',
    linkHref: '/why-recruit-with-msd',
    iconName: 'standard:partners'
};

const THRIVING = {
    heading: 'From hiring to thriving',
    intro:
        'Talk to us early in the recruitment process about candidates who need extra help. We may ' +
        'be able to provide:',
    items: [
        { key: 'wages', text: 'contribution to wages and training for your new hires' },
        {
            key: 'placement',
            text:
                'post-placement support to help them settle into their new role and your team ' +
                'culture'
        },
        {
            key: 'modifications',
            text:
                'extra support like workplace modifications or equipment for disabled people or ' +
                'those with health conditions.'
        }
    ],
    linkLabel: 'Supporting employees',
    linkHref: '/supporting-employees',
    iconName: 'standard:reward'
};

export default class HelpCentre extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    hero = HERO;
    intro = INTRO;
    howItWorks = HOW_IT_WORKS;
    partner = PARTNER;
    thriving = THRIVING;
}
