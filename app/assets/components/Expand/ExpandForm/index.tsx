import {
  Button,
  Form,
  Input,
  message,
  Popover,
  Radio,
  Select,
  Tag,
} from 'antd';
import { FormComponentProps } from 'antd/lib/form';
import React from 'react';
import intl from 'react-intl-universal';
import { connect } from 'react-redux';

import { Instruction } from '#assets/components';
import GQLModal from '#assets/components/GQLModal';
import IconFont from '#assets/components/Icon';
import { DEFAULT_COLOR_PICKER } from '#assets/config/explore';
import ColorPickerBtn from '#assets/modules/Explore/NebulaGraph/Panel/ColorPicker';
import { IDispatch, IRootState } from '#assets/store';
import { RELATION_OPERATORS } from '#assets/utils/constant';
import { getExploreMatchGQL } from '#assets/utils/gql';
import { trackEvent } from '#assets/utils/stat';

import AddFilterForm from '../AddFilterForm';
import './index.less';

const Option = Select.Option;

const mapState = (state: IRootState) => ({
  edgeTypes: state.nebula.edgeTypes,
  edgesFields: state.nebula.edgesFields,
  spaceVidType: state.nebula.spaceVidType,
  selectVertexes: state.explore.selectVertexes,
  exploreRules: state.explore.exploreRules,
  getExpandLoading: state.loading.effects.explore.asyncGetExpand,
});
const mapDispatch = (dispatch: IDispatch) => ({
  asyncGetEdgesAndFields: dispatch.nebula.asyncGetEdgesAndFields,
  asyncGetExpand: dispatch.explore.asyncGetExpand,
  updateExploreRules: rules =>
    dispatch.explore.update({
      exploreRules: rules,
    }),
});

interface IProps
  extends FormComponentProps,
    ReturnType<typeof mapState>,
    ReturnType<typeof mapDispatch> {
  close: () => void;
}

interface IFilter {
  expression: string;
  relation?: string;
}

interface IState {
  filters: IFilter[];
  visible: boolean;
  customColor: string;
}

class Expand extends React.Component<IProps, IState> {
  gqlRef;
  constructor(props: IProps) {
    super(props);
    this.state = {
      filters: [],
      visible: false,
      customColor: DEFAULT_COLOR_PICKER,
    };
    this.gqlRef = React.createRef();
  }

  componentDidMount() {
    this.props.asyncGetEdgesAndFields();
    const {
      exploreRules: { filters },
    } = this.props;
    if (filters) {
      this.setState({ filters });
    }
  }

  renderFilters = () => {
    const { filters } = this.state;
    const formItems = filters.map((item, index) => (
      <div key={index} className="form-item">
        {index > 0 && (
          <Form.Item>
            <Select
              value={item.relation}
              onChange={value => this.handleUpdateFilter(value, index)}
              className="select-relation"
              dropdownClassName="select-relation-dropdown"
              size="small"
            >
              {RELATION_OPERATORS.map(item => (
                <Option value={item.value} key={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <Form.Item>
          <Tag
            className="tag-expression"
            closable={true}
            onClose={_ => this.handleDeleteFilter(index)}
          >
            {item.expression}
          </Tag>
        </Form.Item>
      </div>
    ));
    return formItems;
  };

  handleUpdateFilter = (value, index) => {
    const { filters } = this.state;
    filters[index].relation = value;
    this.setState({
      filters,
    });
  };

  handleDeleteFilter = index => {
    const { filters } = this.state;
    this.setState({
      filters: filters.filter((_, i) => i !== index),
    });
  };

  handleExpand = () => {
    const { selectVertexes, edgesFields } = this.props;
    const { getFieldsValue } = this.props.form;
    const { filters, customColor } = this.state;
    this.props.form.validateFields(async err => {
      if (!err) {
        const {
          edgeTypes,
          edgeDirection,
          stepsType,
          step,
          minStep,
          maxStep,
          vertexColor,
          quantityLimit,
        } = getFieldsValue();
        (this.props.asyncGetExpand({
          filters,
          selectVertexes,
          edgeTypes,
          edgesFields,
          edgeDirection,
          vertexColor,
          quantityLimit,
          stepsType,
          step,
          minStep,
          maxStep,
          customColor,
        }) as any).then(
          async () => {
            message.success(intl.get('common.success'));
            trackEvent('explore', 'expand', 'ajax success');
          },
          (e: any) => {
            trackEvent('explore', 'expand', 'ajax fail');
            if (e.message) {
              message.error(e.message);
            } else {
              message.info(intl.get('common.noData'));
            }
          },
        );
      }
    });
  };

  handleAddFilter = data => {
    const { field, operator, value } = data;
    const { filters } = this.state;
    const expression = `${field} ${operator} ${value}`;
    const newFilter =
      filters.length === 0
        ? { expression }
        : {
            relation: 'AND',
            expression,
          };
    this.setState(
      {
        filters: [...filters, newFilter],
        visible: false,
      },
      this.handleUpdateRules,
    );
  };

  handleResetFilters = () => {
    this.setState({ filters: [] }, this.handleUpdateRules);
  };
  handleVisibleChange = visible => {
    this.setState({ visible });
  };

  hide = () => {
    this.setState({
      visible: false,
    });
  };

  handleViewGQL = () => {
    if (this.gqlRef) {
      this.gqlRef.show();
    }
  };

  handleCustomColor = color => {
    this.setState(
      {
        customColor: color,
      },
      this.handleUpdateRules,
    );
  };

  handleUpdateRules = () => {
    const { getFieldsValue } = this.props.form;
    const { filters, customColor } = this.state;
    setTimeout(() => {
      const {
        edgeTypes,
        edgeDirection,
        stepsType,
        step,
        minStep,
        maxStep,
        vertexColor,
        quantityLimit,
      } = getFieldsValue();
      this.props.updateExploreRules({
        edgeTypes,
        edgeDirection,
        vertexColor,
        quantityLimit,
        stepsType,
        step,
        minStep,
        maxStep,
        customColor,
        filters,
      });
    }, 100);
  };
  render() {
    const {
      edgeTypes,
      exploreRules: rules,
      selectVertexes,
      getExpandLoading,
      spaceVidType,
      close,
    } = this.props;
    const { getFieldDecorator, getFieldsValue } = this.props.form;
    const { filters, customColor } = this.state;
    const {
      edgeTypes: selectEdgeTypes,
      edgeDirection,
      stepsType,
      step,
      minStep,
      maxStep,
      quantityLimit,
    } = getFieldsValue();
    const currentGQL =
      selectEdgeTypes && selectEdgeTypes.length
        ? getExploreMatchGQL({
            selectVertexes,
            edgeTypes: selectEdgeTypes,
            filters,
            edgeDirection,
            quantityLimit,
            spaceVidType,
            stepsType,
            step,
            minStep,
            maxStep,
          })
        : '';
    const fieldTable = this.renderFilters();
    return (
      <div className="graph-expand">
        <div className="expand-config">
          <Form colon={false}>
            <Form.Item label={intl.get('common.edge')}>
              {getFieldDecorator('edgeTypes', {
                initialValue:
                  rules.edgeTypes && rules.edgeTypes.length > 0
                    ? rules.edgeTypes
                    : edgeTypes,
                rules: [
                  {
                    required: true,
                    message: 'Edge Type is required',
                  },
                ],
              })(
                <Select mode="multiple" onChange={this.handleUpdateRules}>
                  {edgeTypes.map(e => (
                    <Option value={e} key={e}>
                      {e}
                    </Option>
                  ))}
                </Select>,
              )}
            </Form.Item>
            <Form.Item label={intl.get('explore.direction')}>
              {getFieldDecorator('edgeDirection', {
                initialValue: rules.edgeDirection || 'outgoing',
                rules: [
                  {
                    required: true,
                  },
                ],
              })(
                <Select onChange={this.handleUpdateRules}>
                  <Option value="outgoing">
                    {intl.get('explore.outgoing')}
                  </Option>
                  <Option value="incoming">
                    {intl.get('explore.incoming')}
                  </Option>
                  <Option value="bidirect">
                    {intl.get('explore.bidirect')}
                  </Option>
                </Select>,
              )}
            </Form.Item>
            <Form.Item
              label={intl.get('explore.steps')}
              className="select-step-type"
            >
              {getFieldDecorator('stepsType', {
                initialValue: rules.stepsType || 'single',
                rules: [
                  {
                    required: true,
                  },
                ],
              })(
                <Radio.Group onChange={this.handleUpdateRules}>
                  <Radio value="single">{intl.get('explore.singleStep')}</Radio>
                  <Radio value="range">{intl.get('explore.rangeStep')}</Radio>
                </Radio.Group>,
              )}
            </Form.Item>
            {stepsType === 'single' && (
              <Form.Item className="input-step">
                {getFieldDecorator('step', {
                  initialValue: rules.step || '1',
                  rules: [
                    {
                      message: intl.get('formRules.positiveIntegerRequired'),
                      pattern: /^\d+$/,
                      transform(value) {
                        if (value) {
                          return Number(value);
                        }
                      },
                    },
                    {
                      required: true,
                    },
                  ],
                })(<Input type="number" onChange={this.handleUpdateRules} />)}
              </Form.Item>
            )}
            {stepsType === 'range' && (
              <div className="input-step">
                <Form.Item>
                  {getFieldDecorator('minStep', {
                    initialValue: rules.minStep || '',
                    rules: [
                      {
                        message: intl.get('formRules.positiveIntegerRequired'),
                        pattern: /^\d+$/,
                        transform(value) {
                          if (value) {
                            return Number(value);
                          }
                        },
                      },
                      {
                        required: true,
                      },
                    ],
                  })(<Input type="number" onChange={this.handleUpdateRules} />)}
                </Form.Item>
                -
                <Form.Item>
                  {getFieldDecorator('maxStep', {
                    initialValue: rules.maxStep || '',
                    rules: [
                      {
                        message: intl.get('formRules.positiveIntegerRequired'),
                        pattern: /^\d+$/,
                        transform(value) {
                          if (value) {
                            return Number(value);
                          }
                        },
                      },
                      {
                        required: true,
                      },
                    ],
                  })(<Input type="number" onChange={this.handleUpdateRules} />)}
                </Form.Item>
              </div>
            )}
            <Form.Item label={intl.get('explore.vertexColor')}>
              {getFieldDecorator('vertexColor', {
                initialValue: rules.vertexColor || 'groupByTag',
                rules: [
                  {
                    required: true,
                  },
                ],
              })(
                <Radio.Group onChange={this.handleUpdateRules}>
                  <Radio value="groupByTag">
                    {intl.get('explore.groupByTag')}
                  </Radio>
                  <Radio value="custom">
                    {intl.get('explore.customColor')}
                  </Radio>
                  <ColorPickerBtn
                    onChange={this.handleCustomColor}
                    customColor={customColor}
                    editing={true}
                  />
                </Radio.Group>,
              )}
            </Form.Item>
            <Form.Item label={intl.get('explore.quantityLimit')}>
              {getFieldDecorator('quantityLimit', {
                initialValue: rules.quantityLimit || 100,
                rules: [
                  {
                    message: intl.get('formRules.positiveIntegerRequired'),
                    pattern: /^\d+$/,
                    transform(value) {
                      if (value) {
                        return Number(value);
                      }
                    },
                  },
                ],
              })(<Input type="number" onChange={this.handleUpdateRules} />)}
            </Form.Item>
            <div className="filter-component">
              <div className="filter-header">
                <span>{intl.get('explore.filter')}</span>
                <div className="btn-reset" onClick={this.handleResetFilters}>
                  <IconFont type="iconstudio-remake" />
                  <span>{intl.get('import.reset')}</span>
                </div>
              </div>
              {fieldTable}
              <Popover
                content={
                  <AddFilterForm
                    onConfirm={this.handleAddFilter}
                    onCancel={this.hide}
                  />
                }
                visible={this.state.visible}
                onVisibleChange={this.handleVisibleChange}
                trigger="click"
              >
                <Button className="btn-add-filter" icon="plus" type="link">
                  {intl.get('explore.addCondition')}
                </Button>
              </Popover>
            </div>
          </Form>
          <GQLModal
            gql={currentGQL}
            handlerRef={handler => {
              this.gqlRef = handler;
            }}
          />
          <Button className="btn-gql" onClick={this.handleViewGQL}>
            {intl.get('common.exportNGQL')}
          </Button>
        </div>
        <div className="expand-footer">
          <IconFont
            type="iconstudio-indentleft"
            className="btn-collapse"
            onClick={close}
          />
          <Button
            type="primary"
            onClick={this.handleExpand}
            loading={!!getExpandLoading}
            disabled={
              !selectVertexes.length ||
              !selectEdgeTypes ||
              !selectEdgeTypes.length ||
              quantityLimit < 0
            }
          >
            {intl.get('explore.expand')}
          </Button>
          <Instruction description={intl.get('explore.expandTips')} />
        </div>
      </div>
    );
  }
}

export default connect(mapState, mapDispatch)(Form.create()(Expand));
