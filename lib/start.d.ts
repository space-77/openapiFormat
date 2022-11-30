import DocApi from './docApi';
import { DictList } from './common/translate';
export default function (url: string | object, dictList?: DictList[]): Promise<{
    docApi: DocApi;
    dictList: DictList[];
}>;
