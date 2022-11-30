import TypeInfoBase from './base';
import Components, { ModuleName } from '../components';
import type { ParameterObject } from '../../types/openapi';
export declare type CustomObject = Omit<ParameterObject, 'in'>;
export declare type CustomOp = {
    parent: Components;
    name: string;
    datas: CustomObject[] | string;
    moduleName: ModuleName;
};
export default class Custom extends TypeInfoBase {
    datas: CustomObject[];
    typeValue?: string;
    constructor(op: CustomOp);
    init: () => void;
}
