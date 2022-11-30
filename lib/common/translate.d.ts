export declare type DictList = {
    zh: string;
    en: string;
};
export declare type WaitTranslate = {
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
    text: string;
};
export default class Translate {
    dictList: DictList[];
    private waitTranslateList;
    private engines;
    constructor(dictList?: DictList[]);
    static startCaseClassName(textEn: string): string;
    private onTranslate;
    find(text: string): DictList | undefined;
    addTranslate(text: string): Promise<string>;
    translate(): Promise<void>;
}
