import 'echarts/lib/chart/custom';
import 'echarts/lib/component/grid';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

use([SVGRenderer]);

export { init };
