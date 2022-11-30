import Components, { ModuleName } from '../components';
import TypeInfoBase from './base';
import type { SchemasData } from '../../types/openapi';
export declare type SchemasOp = {
    parent: Components;
    name: string;
    data: SchemasData;
    resConentType?: string;
    moduleName: ModuleName;
};
export default class Schemas extends TypeInfoBase {
    data: SchemasOp['data'];
    resConentType?: string;
    constructor(op: SchemasOp);
    init: () => void;
}
