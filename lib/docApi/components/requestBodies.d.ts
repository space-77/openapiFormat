import Components, { ModuleName } from '../components';
import TypeInfoBase from './base';
import type { BodyObject, ResponseData, SchemaObject, MediaTypeObject, ReferenceObject } from '../../types/openapi';
export declare type RequestBodiesOp = {
    parent: Components;
    name: string;
    data: BodyObject | ResponseData;
    moduleName: ModuleName;
};
export default class RequestBodies extends TypeInfoBase {
    data: RequestBodiesOp['data'];
    required?: boolean;
    contentType?: string;
    additionalProperties?: boolean | ReferenceObject | SchemaObject;
    constructor(op: RequestBodiesOp);
    init(): void;
    format(mediaTypeObject: MediaTypeObject): void;
}
