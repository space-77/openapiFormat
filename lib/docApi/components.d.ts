import { PathItem } from './index';
import TypeInfoBase from './components/base';
import Custom, { CustomObject } from './components/custom';
import type { Document } from '../types/openapi';
export declare type ModuleName = 'schemas' | 'responses' | 'parameters' | 'requestBodies' | 'custom';
export declare type TypeInfoItem = {
    typeName: string;
    moduleName: ModuleName;
    typeInfo: TypeInfoBase;
};
export default class Components {
    private baseDate;
    private pathItems;
    typeInfoList: TypeInfoItem[];
    constructor(baseDate: Document, pathItems: PathItem[]);
    checkName(name: string): string;
    pushTypeItem(typeInfo: TypeInfoBase): void;
    private createsObj;
    private createsPathType;
    private formatCode;
    addCustomType(name: string, types: CustomObject[] | string): Custom;
}
