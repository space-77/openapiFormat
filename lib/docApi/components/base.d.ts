import { SchemaObjectType, ParameterObject, SchemaObject, ReferenceObject, ExternalDocumentationObject, SchemasData } from '../../types/openapi';
import TypeItem from '../typeItem';
import Components, { ModuleName } from '../components';
export declare type RefItem = {
    typeInfo: TypeInfoBase;
    genericsItem?: TypeInfoBase | string;
};
export default abstract class TypeInfoBase {
    protected parent: Components;
    name: string;
    moduleName: ModuleName;
    title?: string;
    typeName: string;
    typeItems: TypeItem[];
    deprecated?: boolean;
    description?: string;
    refs: RefItem[];
    attrs: Record<string, any>;
    realBody?: TypeInfoBase;
    /** 外部链接描叙 */
    externalDocs?: ExternalDocumentationObject;
    resConentType?: string;
    get isEmpty(): boolean;
    constructor(parent: Components, name: string, moduleName: ModuleName);
    /**
     * @desc 获取真实类型，跳过空类型引用
     * 例如： C extends B, B extends A, 如果 B 和 C 都是空类型，那么调用 C 和 B 类型其实就是调用 A 类型
     */
    getRealBody(): TypeInfoBase;
    getAllRefs(): RefItem[];
    getTypeItems: () => TypeItem[];
    abstract init(): void;
    protected getType(type?: SchemaObjectType, ref?: string): TypeItem['type'];
    protected findRefType(ref: string): TypeInfoBase | undefined;
    protected pushRef(ref?: string, genericsItem?: TypeInfoBase): void;
    protected createGenericsTypeinfo(items: ReferenceObject | SchemaObject, name: string): RefItem;
    protected createSchemaTypeItem(schema: SchemaObject, name: string): TypeItem[];
    protected createSchemaType(keyName: string, schema: SchemasData, required?: boolean): TypeItem;
    protected formatParameters(data: ParameterObject): TypeItem;
}
