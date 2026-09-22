import { LightningElement } from 'lwc';

const MENU_ITEMS = [
    { value: 'edit', label: 'Edit', iconName: 'utility:edit' },
    { value: 'clone', label: 'Clone', iconName: 'utility:copy' },
    { value: 'delete', label: 'Delete', iconName: 'utility:delete' }
];

export default class Buttons extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    menuItems = MENU_ITEMS;
    liked = false;
    lastAction = 'none yet';

    get likeLabel(): string {
        return this.liked ? 'Liked' : 'Like';
    }

    handleAction(event: Event): void {
        const target = event.target as HTMLElement & { label?: string };
        this.lastAction = target.label || 'button';
    }

    handleToggleLike(): void {
        this.liked = !this.liked;
    }

    handleMenuSelect(event: CustomEvent): void {
        this.lastAction = `menu: ${event.detail.value}`;
    }

    variantsCode = `<lightning-button label="Neutral"></lightning-button>
<lightning-button variant="brand" label="Brand"></lightning-button>
<lightning-button variant="destructive" label="Destructive"></lightning-button>
<lightning-button variant="success" label="Success"></lightning-button>`;

    iconCode = `<lightning-button-icon icon-name="utility:settings" alternative-text="Settings">
</lightning-button-icon>
<lightning-button-icon-stateful icon-name="utility:like" selected={liked}
    onclick={handleToggleLike}></lightning-button-icon-stateful>`;

    groupCode = `<lightning-button-group>
    <lightning-button label="Refresh"></lightning-button>
    <lightning-button label="Edit"></lightning-button>
    <lightning-button-menu alternative-text="More actions">
        <lightning-menu-item value="edit" label="Edit"></lightning-menu-item>
    </lightning-button-menu>
</lightning-button-group>`;
}
