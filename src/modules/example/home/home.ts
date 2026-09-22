import { LightningElement } from 'lwc';
import COMPONENTS from 'data/catalog';

interface Component {
    examples: unknown[];
}

const ALL = COMPONENTS as Component[];

/** Placeholder homepage. Real site content goes here. */
export default class Home extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    componentCount = ALL.length;
    exampleCount = ALL.reduce((total, c) => total + c.examples.length, 0);
}
