import 'echarts/lib/chart/line';
import 'echarts/lib/component/grid';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/aria';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

use([SVGRenderer]);

export { init };
