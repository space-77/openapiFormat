import Components from './components';
import ComponentsBase from './components/base';
import type { OpenAPIV3 } from 'openapi-types';
import { OperationObject } from '../types/openapi';
import { HttpMethods } from '../common';
export interface PathItem {
    name: string;
    item: OpenAPIV3.OperationObject;
    method: HttpMethods;
    apiPath: string;
    bodyName: string;
    moduleName: string;
    paramsName: string;
    responseName: string;
    responseType?: ComponentsBase;
    parameterType?: ComponentsBase;
    requestBodyType?: ComponentsBase;
}
export declare type FuncGroupList = {
    moduleName: string;
    description?: string;
    funcInfoList: PathItem[];
};
export declare type FuncGroupItem = {
    item: OperationObject;
    apiPath: string;
    method: HttpMethods;
    tags: string[];
};
export declare type FuncGroup = {
    funs: FuncGroupItem[];
    moduleName: string;
    tagInfo?: OpenAPIV3.TagObject;
};
export declare type PathInfo = {
    moduleName: string;
    tagInfo?: OpenAPIV3.TagObject;
    pathItems: PathItem[];
};
export default class DocApi {
    json: OpenAPIV3.Document;
    funcGroupList: PathInfo[];
    private pathItems;
    typeGroup: Components;
    constructor(json: OpenAPIV3.Document);
    init(): Promise<void>;
    private formatTypes;
    private funcGroup;
    private creatFunItem;
    private formatFunsV2;
    private createFunName;
}
