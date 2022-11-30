import Components, { ModuleName } from '../components';
import TypeInfoBase from './base';
import type { SchemaObject, ParameterObject, ReferenceObject } from '../../types/openapi';
export declare type Schema = ReferenceObject & SchemaObject;
export declare type ParametersData = ReferenceObject | ParameterObject;
export declare type ParametersOp = {
    parent: Components;
    name: string;
    datas: ParametersData[];
    moduleName: ModuleName;
};
export default class Parameters extends TypeInfoBase {
    datas: ParametersOp['datas'];
    additionalProperties: any;
    constructor(op: ParametersOp);
    init: () => void;
}
