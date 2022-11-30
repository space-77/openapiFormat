"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const typeItem_1 = __importDefault(require("../typeItem"));
const schemas_1 = __importDefault(require("./schemas"));
const utils_1 = require("../../common/utils");
const baseRef = '#/components/';
class TypeInfoBase {
    parent;
    name;
    moduleName;
    title;
    typeName;
    typeItems = [];
    deprecated;
    description;
    // moduleName: ModuleName
    // 继承类型的泛型入参 interface TypeName extends Array<number> {}
    refs = [];
    attrs = {}; // 自定义属性
    realBody; // 真实的引用
    // childrenRefs: TypeInfoBase[] = [] // 该类型被其它类型引用
    /** 外部链接描叙 */
    externalDocs;
    resConentType;
    get isEmpty() {
        const { typeItems, refs } = this;
        return (refs.every(i => i.typeInfo.isEmpty && i.typeInfo?.typeName !== 'Array') &&
            typeItems.filter(i => !i.disable).length === 0);
    }
    constructor(parent, name, moduleName) {
        this.parent = parent;
        this.name = name;
        this.moduleName = moduleName;
        this.typeName = parent.checkName((0, utils_1.firstToUpper)(name));
    }
    /**
     * @desc 获取真实类型，跳过空类型引用
     * 例如： C extends B, B extends A, 如果 B 和 C 都是空类型，那么调用 C 和 B 类型其实就是调用 A 类型
     */
    getRealBody() {
        const typeItems = this.typeItems.filter(i => !i.disable);
        // 只有一个应用类型，并且没有子类型，并且有添加过真实类型的才可以往上去父类作为自己的类型
        if (this.refs.length === 1 && typeItems.length === 0 && this.realBody) {
            return this.realBody.getRealBody();
        }
        return this;
    }
    getAllRefs() {
        if (this.refs.length === 0) {
            return [];
        }
        else {
            const refsList = [];
            this.refs.forEach(ref => {
                if (ref.typeInfo.refs.length > 0) {
                    refsList.push(...ref.typeInfo.getAllRefs());
                }
                else {
                }
                refsList.push(ref);
            });
            return refsList;
        }
    }
    getTypeItems = () => {
        const allTypesList = [...this.typeItems];
        const allRef = lodash_1.default.uniq(lodash_1.default.flattenDeep(this.getAllRefs()));
        allRef.forEach(i => {
            const { typeItems } = i.typeInfo;
            if (typeItems.length > 0)
                allTypesList.push(...typeItems);
        });
        return lodash_1.default.uniq(allTypesList).map(i => {
            if (this.moduleName === 'requestBodies') {
                const ii = lodash_1.default.cloneDeep(i);
                ii.paramType = 'body';
                return ii;
            }
            else {
                return i;
            }
        });
    };
    getType(type, ref) {
        if (ref)
            return this.findRefType(ref);
        if (!type)
            return 'any';
        if (type === 'array')
            return 'Array';
        if (type === 'integer')
            return 'number';
        return type;
    }
    findRefType(ref) {
        if (!ref.startsWith(baseRef))
            return;
        const [moduleName, typeName] = ref.replace(baseRef, '').split('/');
        const typeItem = this.parent.typeInfoList.find(i => i.moduleName === moduleName && i.typeInfo.name === typeName);
        return typeItem?.typeInfo;
    }
    pushRef(ref, genericsItem) {
        if (!ref)
            return;
        const typeInfo = this.findRefType(ref);
        if (typeInfo) {
            this.realBody = typeInfo;
            // typeInfo.childrenRefs.push(this)
            this.refs.push({ typeInfo, genericsItem });
        }
    }
    createGenericsTypeinfo(items, name) {
        // 继承泛型逻辑
        const { parent } = this;
        const { type } = items;
        const { $ref } = items;
        const { items: cItems } = items;
        const option = { parent, name: 'Array', data: items, moduleName: 'schemas' };
        const typeInfo = new schemas_1.default(option); // 创建 ts 原生 Array【用于类型继承，不会生成类型】
        let genericsItem = 'any';
        if ($ref) {
            genericsItem = this.findRefType($ref);
        }
        else if (typeof type === 'string') {
            genericsItem = this.getType(type);
        }
        else if (cItems) {
            // 创建泛型类型
            const option = { parent, name: (0, utils_1.firstToUpper)(`${name}T`), data: cItems, moduleName: 'schemas' };
            genericsItem = new schemas_1.default(option);
            genericsItem.init();
            this.parent.pushTypeItem(genericsItem);
        }
        return { typeInfo, genericsItem };
    }
    createSchemaTypeItem(schema, name) {
        const { items } = schema;
        const { properties, additionalProperties, required = [], type } = schema;
        // 泛型逻辑
        if (items) {
            const ref = this.createGenericsTypeinfo(items, name);
            this.refs.push(ref);
        }
        if (!properties)
            return [];
        const typeItemList = Object.entries(properties).map(([name, schema]) => this.createSchemaType(name, schema, required.includes(name)));
        // TODO 处理 Record 类型
        if (additionalProperties) {
            if (typeof additionalProperties === 'boolean') {
            }
            else {
                // let typeItem =
                if (additionalProperties.$ref) {
                }
                // console.log(additionalProperties)
            }
            // const { propertyName, mapping } = discriminator
            // typeItemList.push(
            //   new TypeItem({
            //     name: propertyName,
            //     type: !mapping ? 'Record<string, any>' : undefined,
            //     children: mapping
            //       ? Object.entries(mapping).map(
            //           ([name, value]) => new TypeItem({ name, type: this.getType(value as SchemaObjectType) })
            //         )
            //       : undefined
            //   })
            // )
        }
        return typeItemList;
    }
    createSchemaType(keyName, schema, required) {
        const { $ref } = schema;
        const { items } = schema; // 数组需要泛型入参
        const { type } = schema;
        const { format, example, nullable, properties = {}, deprecated, description, externalDocs, enum: _enum = [], required: childrenRequired = [] } = schema;
        const children = Object.entries(properties).map(([name, schema]) => this.createSchemaType(name, schema, childrenRequired.includes(name)));
        return new typeItem_1.default({
            ref: items ? this.createGenericsTypeinfo(items, keyName) : undefined,
            format,
            example,
            nullable,
            children,
            required,
            deprecated,
            description,
            externalDocs,
            name: keyName,
            enumTypes: _enum,
            type: this.getType(type, $ref)
        });
    }
    formatParameters(data) {
        const { name, in: paramType, deprecated, schema = {}, required, description, example } = data;
        const typeItem = this.createSchemaType(name, { ...schema, deprecated, description, example }, required);
        typeItem.paramType = paramType;
        return typeItem;
    }
}
exports.default = TypeInfoBase;
