import { LightningElement } from 'lwc';

const COLUMNS = [
    { label: 'Account', fieldName: 'name' },
    { label: 'Industry', fieldName: 'industry' },
    { label: 'Revenue', fieldName: 'revenue', type: 'currency' },
    { label: 'Employees', fieldName: 'employees', type: 'number' },
    { label: 'Website', fieldName: 'website', type: 'url' }
];

const ROWS = [
    { id: '1', name: 'Acme Corporation', industry: 'Manufacturing', revenue: 4200000, employees: 320, website: 'https://example.com' },
    { id: '2', name: 'Globex', industry: 'Technology', revenue: 8750000, employees: 1180, website: 'https://example.com' },
    { id: '3', name: 'Initech', industry: 'Finance', revenue: 1950000, employees: 96, website: 'https://example.com' },
    { id: '4', name: 'Umbrella Health', industry: 'Healthcare', revenue: 6100000, employees: 740, website: 'https://example.com' }
];

const TREE_ITEMS = [
    {
        label: 'Australia',
        name: 'au',
        expanded: true,
        items: [
            { label: 'Victoria', name: 'vic', items: [{ label: 'Melbourne', name: 'mel' }] },
            { label: 'New South Wales', name: 'nsw', items: [{ label: 'Sydney', name: 'syd' }] }
        ]
    },
    { label: 'New Zealand', name: 'nz', items: [{ label: 'Auckland', name: 'akl' }] }
];

export default class Data extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    columns = COLUMNS;
    rows = ROWS;
    treeItems = TREE_ITEMS;
    // formatted-date-time takes an ISO string; relative-date-time wants a
    // timestamp or Date, so the two demos use different shapes of the same value.
    today = new Date().toISOString();
    nowTimestamp = Date.now();

    datatableCode = `<lightning-datatable
    key-field="id"
    columns={columns}
    data={rows}>
</lightning-datatable>`;
}
