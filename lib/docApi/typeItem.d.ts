import { OpenAPIV3 } from 'openapi-types';
import ComponentsBase from './components/base';
export interface TypeItemOption {
    name: string;
    type?: string | ComponentsBase;
    default?: string;
    example?: string;
    children?: TypeItem[];
    nullable?: boolean;
    required?: boolean;
    enumTypes?: any[];
    paramType?: 'query' | 'header' | 'path' | 'body' | 'cookie';
    deprecated?: boolean;
    description?: string;
    minLength?: number;
    maxLength?: number;
    format?: string;
    externalDocs?: OpenAPIV3.ExternalDocumentationObject; /** 外部链接描叙 */
    ref?: {
        typeInfo: ComponentsBase;
        genericsItem?: ComponentsBase | string;
    };
}
export default class TypeItem {
    name: string;
    type?: TypeItemOption['type'];
    example?: string;
    default?: string;
    required?: boolean;
    nullable?: boolean; /** 可以为空 */
    children?: TypeItem[];
    enumTypes?: any[];
    paramType?: TypeItemOption['paramType'];
    deprecated?: boolean; /** 是否弃用 */
    description?: string;
    minLength?: number;
    maxLength?: number;
    format?: string;
    disable: boolean;
    /** 泛型入参 */
    ref?: TypeItemOption['ref'];
    externalDocs?: TypeItemOption['externalDocs'];
    constructor(option: TypeItemOption);
    getKeyValue(): string;
    getTypeValue(): string;
    getDesc(): string;
}
