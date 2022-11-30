"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./components/base"));
class TypeItem {
    name;
    type;
    example;
    default;
    required;
    nullable; /** 可以为空 */
    children;
    enumTypes;
    paramType;
    deprecated; /** 是否弃用 */
    description;
    minLength;
    maxLength;
    format;
    disable;
    /** 泛型入参 */
    ref;
    // genericsItem?: string | ComponentsBase | TypeItem /** 泛型入参 */ // 可能是 字符串， 可能是 引用类型， 可能是 引用类型也是需要入参的
    externalDocs;
    constructor(option) {
        const { name, type, example, default: def, required } = option;
        const { ref, format, nullable, children, enumTypes, paramType, deprecated, description, externalDocs, maxLength, minLength } = option;
        this.ref = ref;
        this.name = name;
        this.type = type;
        this.format = format;
        this.default = def;
        this.example = example;
        this.required = required;
        this.nullable = nullable;
        this.children = children;
        this.enumTypes = enumTypes;
        this.paramType = paramType;
        this.deprecated = deprecated;
        this.description = description;
        this.externalDocs = externalDocs;
        this.minLength = minLength;
        this.maxLength = maxLength;
        this.disable = false;
    }
    getKeyValue() {
        const { type, enumTypes = [], nullable, children = [], ref, format } = this;
        const { typeInfo, genericsItem } = ref ?? {}; // 泛型
        let content = '';
        if (enumTypes.length > 0) {
            content = enumTypes.map(i => `"${i}"`).join(' | ');
        }
        else if (typeof type === 'string') {
            if (format === 'binary') {
                // 使用文件 类型
                content = 'File';
            }
            else {
                content = type;
            }
        }
        else if (type instanceof base_1.default) {
            content = type.getRealBody().typeName;
        }
        else if (!nullable) {
            content = 'any';
        }
        if (typeInfo) {
            // 生成泛型
            content = typeInfo.typeName;
            const typeNameT = typeof genericsItem === 'string' ? genericsItem : genericsItem?.typeName;
            content += `<${typeNameT ?? 'any'}>`;
        }
        // FIXME 如果泛型存在，而且也有子类型，该怎么处理？
        if (children.length > 0) {
            // 存在子类型，覆盖上面类型
            content = `{${children.map(i => i.getTypeValue()).join('')}}`;
        }
        return `${content}${nullable ? `${content ? '|' : ''}null` : ''}`;
    }
    getTypeValue() {
        const { name, required } = this;
        const desc = this.getDesc();
        const typeValue = this.getKeyValue();
        return `${desc}${name.replace(/-/g, '_')}${required ? '' : '?'}:${typeValue}\n`;
    }
    getDesc() {
        const { description, deprecated, example, default: def, externalDocs } = this;
        if (!description && !example && !deprecated && !def && !externalDocs)
            return '';
        const { url, description: linkDescription } = externalDocs ?? {};
        const defaultStr = def ? `\r\n* @default ${def}` : '';
        const exampleStr = example ? `\r\n* @example ${example}` : '';
        const deprecatedStr = deprecated ? '\r\n* @deprecated' : '';
        const descriptionStr = description ? `\r\n* @description ${description}` : '';
        const link = url ? `\r\n* @link ${url} ${linkDescription}` : '';
        return `/**${exampleStr}${defaultStr}${descriptionStr}${deprecatedStr}${link}\r\n*/\r\n`;
    }
}
exports.default = TypeItem;
