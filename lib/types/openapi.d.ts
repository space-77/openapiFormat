import type { OpenAPIV3 } from 'openapi-types';
export declare type Document = OpenAPIV3.Document;
export declare type SchemaObject = OpenAPIV3.SchemaObject;
export declare type ResponseObject = OpenAPIV3.ResponseObject;
export declare type OperationObject = OpenAPIV3.OperationObject;
export declare type ReferenceObject = OpenAPIV3.ReferenceObject;
export declare type ParameterObject = OpenAPIV3.ParameterObject;
export declare type MediaTypeObject = OpenAPIV3.MediaTypeObject;
export declare type BaseSchemaObject = OpenAPIV3.BaseSchemaObject;
export declare type ComponentsObject = OpenAPIV3.ComponentsObject;
export declare type ArraySchemaObject = OpenAPIV3.ArraySchemaObject;
export declare type RequestBodyObject = OpenAPIV3.RequestBodyObject;
export declare type NonArraySchemaObject = OpenAPIV3.NonArraySchemaObject;
export declare type ArraySchemaObjectType = OpenAPIV3.ArraySchemaObjectType;
export declare type NonArraySchemaObjectType = OpenAPIV3.NonArraySchemaObjectType;
export declare type ExternalDocumentationObject = OpenAPIV3.ExternalDocumentationObject;
export declare type GenericsType = SchemaObject & Partial<ReferenceObject>;
export declare type SchemaObjectType = NonArraySchemaObjectType | ArraySchemaObjectType;
export declare type SchemasData = ReferenceObject | SchemaObject;
export declare type BodyObject = ReferenceObject | RequestBodyObject;
export declare type ResponseData = ReferenceObject | ResponseObject;
export declare type Properties = SchemasData;
