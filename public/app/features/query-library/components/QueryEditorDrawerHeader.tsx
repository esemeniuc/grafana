import { css, cx } from '@emotion/css';
import React, { useEffect, useRef, useState } from 'react';
import InlineSVG from 'react-inlinesvg/esm';

import { GrafanaTheme2 } from '@grafana/data/src';
import { Button, HorizontalGroup, Icon, IconName, useStyles2 } from '@grafana/ui';

import { useAppNotification } from '../../../core/copy/appNotification';
import { SavedQuery } from '../api/SavedQueriesApi';
import { getSavedQuerySrv } from '../api/SavedQueriesSrv';

import { QueryName } from './QueryName';

type Props = {
  onSavedQueryChange: (newQuery: SavedQuery) => void;
  savedQuery: SavedQuery;
  onDismiss: () => void;
};

export const QueryEditorDrawerHeader = ({ savedQuery, onDismiss, onSavedQueryChange }: Props) => {
  const notifyApp = useAppNotification();
  const styles = useStyles2(getStyles);

  const dropdownRef = useRef(null);

  const [queryName, setQueryName] = useState(savedQuery.title);
  const [showUseQueryOptions, setShowUseQueryOptions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setShowUseQueryOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  const deleteQuery = async () => {
    await getSavedQuerySrv().deleteSavedQuery({ uid: savedQuery.uid });
    onDismiss();
  };

  const useQueryOptions = [
    { label: 'Create dashboard panel', value: 'dashboard-panel', icon: 'apps' },
    { label: 'Create alert rule in Alert Manager', value: 'alert-rule', icon: 'bell' },
    { label: 'Use in explore', value: 'explore', icon: 'compass' },
    { label: 'Create SLO', value: 'slo', icon: 'crosshair' },
    {
      label: 'Create incident in Grafana OnCall',
      value: 'incident-oncall',
      icon: 'record-audio',
      src: 'public/app/features/query-library/img/grafana_incident.svg',
    },
    {
      label: 'Create incident in Grafana Incident',
      value: 'incident-grafana',
      icon: 'heart-break',
      src: 'public/app/features/query-library/img/grafana_oncall.svg',
    },
    {
      label: 'Explore logs',
      value: 'incident-incident',
      icon: 'search',
      src: 'public/app/plugins/datasource/loki/img/loki_icon.svg',
    },
  ];

  const onQueryNameChange = (name: string) => {
    setQueryName(name);
    onSavedQueryChange({
      ...savedQuery,
      title: name,
    });
  };

  const onQuerySave = async () => {
    await getSavedQuerySrv()
      .updateSavedQuery(savedQuery)
      .then(() => notifyApp.success('Query updated'))
      .catch((err) => {
        const msg = err.data?.message || err;
        notifyApp.warning(msg);
      });
    onDismiss();
  };

  return (
    <>
      <div className={styles.header}>
        <HorizontalGroup justify={'space-between'}>
          <QueryName name={queryName} onChange={onQueryNameChange} />
          <HorizontalGroup>
            <Button icon="times" size="md" variant={'secondary'} onClick={onDismiss} autoFocus={false}>
              Close
            </Button>
            <Button
              icon={'grafana'}
              variant="secondary"
              size="md"
              onClick={() => {
                setShowUseQueryOptions(!showUseQueryOptions);
              }}
            >
              Use query
            </Button>
            <Button icon="sync" size="md" variant={'secondary'}>
              Run
            </Button>
            {/*<Button icon="share-alt" size="sm" variant={'secondary'}>Export</Button>*/}
            <Button icon="lock" size="md" variant={'secondary'} />
            <Button size="md" variant={'primary'} onClick={onQuerySave}>
              Save
            </Button>
            <Button icon="trash-alt" size="md" variant={'destructive'} onClick={deleteQuery} />
          </HorizontalGroup>
        </HorizontalGroup>
        {/*@TODO Nicer submenu*/}
        <HorizontalGroup>
          {showUseQueryOptions && (
            <div
              className="panel-menu-container dropdown open"
              style={{ height: 0 }}
              ref={dropdownRef}
              onClick={() => {
                setShowUseQueryOptions(false);
              }}
            >
              <ul className={cx('dropdown-menu dropdown-menu--menu panel-menu', styles.dropdown)}>
                {useQueryOptions.map((option, key) => {
                  return (
                    <li key={key}>
                      <a>
                        <div>
                          {option.src ? (
                            <InlineSVG src={option.src} className={styles.optionSvg} />
                          ) : (
                            <Icon name={option.icon as IconName} className={styles.menuIconClassName} />
                          )}
                        </div>
                        <span className="dropdown-item-text">{option.label}</span>
                        <span className="dropdown-menu-item-shortcut" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </HorizontalGroup>
      </div>
    </>
  );
};

export const getStyles = (theme: GrafanaTheme2) => {
  return {
    cascaderButton: css`
      height: 24px;
    `,
    header: css`
      padding-top: 5px;
      padding-bottom: 15px;
    `,
    menuIconClassName: css`
      margin-right: ${theme.v1.spacing.sm};
      a::after {
        display: none;
      }
    `,
    optionSvg: css`
      margin-right: 8px;
      width: 16px;
      height: 16px;
    `,
    dropdown: css`
      left: 609px;
      top: 2px;
    `,
  };
};
