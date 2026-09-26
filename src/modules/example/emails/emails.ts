import { LightningElement } from 'lwc';

interface EmailEntry {
    /** Matches the lightning-vertical-navigation-item name. */
    name: string;
    label: string;
    subject: string;
    from: string;
    to: string;
    preheader: string;
    /** What sends it, shown under the nav so the list explains itself. */
    trigger: string;
}

const EMAILS: EmailEntry[] = [
    {
        name: 'secure-invite',
        label: 'Secure invite email',
        subject: 'Hana Reweti has invited you to the MSD Employer portal',
        from: 'MSD Employer portal <no-reply@employers.msd.govt.nz>',
        to: 'Tomasi Fifita <employer2@test.com>',
        preheader: 'Accept your invitation to join Neighbourhood Builders Ltd.',
        trigger: 'Sent when an admin invites a colleague from Manage org.'
    },
    {
        name: 'welcome',
        label: 'Welcome email',
        subject: 'Welcome to the MSD Employer portal',
        from: 'MSD Employer portal <no-reply@employers.msd.govt.nz>',
        to: 'Tomasi Fifita <employer2@test.com>',
        preheader: 'Your account is active — here is what you can do now.',
        trigger: 'Sent once an account is active, by invitation or registration.'
    }
];

/**
 * Email browser — a prototyping tool, like /design-system and /data. It renders
 * each transactional email template at the width a mail client would.
 *
 * The templates themselves live in `ui/email*`, so each one stays a single file
 * a developer could hand to whatever sends the real thing.
 */
export default class Emails extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    emails = EMAILS;
    selected: string = EMAILS[0].name;

    get current(): EmailEntry {
        return this.emails.find((e) => e.name === this.selected) ?? this.emails[0];
    }

    get isSecureInvite(): boolean {
        return this.current.name === 'secure-invite';
    }

    get isWelcome(): boolean {
        return this.current.name === 'welcome';
    }

    handleSelect(event: CustomEvent): void {
        const name = (event.detail as { name?: string })?.name;
        if (name) {
            this.selected = name;
        }
    }
}
