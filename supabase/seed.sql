-- ============================================================
--  Realty Office — بيانات تجريبية (Seed)
--  ⚠️ قبل التشغيل: أنشئ المستخدمين الأربعة من
--     Supabase Dashboard -> Authentication -> Users -> Add user
--     admin@realty.app / sara@realty.app / khaled@realty.app / mona@realty.app
--     كلمة المرور المقترحة: Demo@12345  (غيّرها بعد التشغيل)
--     ثم ارفع حساب admin@realty.app ليكون role = 'admin':
--        update public.profiles set role = 'admin' where email = 'admin@realty.app';
--  بعدها شغّل الملف ده مرة واحدة فقط.
-- ============================================================

do $$
declare
  v_admin  uuid;
  v_sara   uuid;
  v_khaled uuid;
  v_mona   uuid;

  v_govs   text[] := array['القاهرة','القاهرة','القاهرة','القاهرة','القاهرة','القاهرة','الجيزة','الجيزة','الجيزة','الجيزة','الإسكندرية','الإسكندرية','بني سويف','بني سويف'];
  v_distr  text[] := array['المقطم','مدينة نصر','التجمع الخامس','المعادي','مصر الجديدة','الزيتون','الشيخ زايد','6 أكتوبر','الهرم','الدقي','سموحة','سيدي جابر','بني سويف الجديدة','شرق النيل'];
  v_types  text[] := array['apartment','apartment','apartment','apartment','duplex','villa','studio','land','shop','office','building','warehouse'];
  v_finish text[] := array['super_lux','fully_finished','semi_finished','core_shell','needs_renovation'];
  v_owners text[] := array['م. حسن فؤاد','أ. منى الشربيني','د. طارق نور','الحاج سيد عبد العال','أ. رانيا كمال','م. عمرو زكي','أ. هبة الله مصطفى','الكابتن وليد سامي','أ. نرمين عادل','م. يوسف الشناوي'];
  v_agents uuid[];

  v_clients text[][] := array[
    ['محمد عبد الله','01012345601','buyer','active','facebook','3500000'],
    ['هدى الشريف','01012345602','buyer','lead','olx','2200000'],
    ['شركة النيل للمقاولات','01012345603','seller','active','referral','0'],
    ['أحمد سامي','01012345604','buyer','closed','walk_in','5000000'],
    ['مروة عادل','01012345605','buyer','active','facebook','1800000'],
    ['د. خالد منير','01012345606','both','active','referral','8000000'],
    ['سلمى فتحي','01012345607','buyer','lost','phone','1200000'],
    ['م. عمر حجازي','01012345608','seller','active','walk_in','0'],
    ['نيفين كامل','01012345609','buyer','lead','olx','2750000'],
    ['مصطفى عبد الغني','01012345610','buyer','active','facebook','4200000'],
    ['ريم الشاذلي','01012345611','buyer','closed','referral','3100000'],
    ['أ. عادل نصيف','01012345612','seller','active','phone','0'],
    ['شركة الأمل للتجارة','01012345613','buyer','active','referral','12000000'],
    ['ياسمين حسن','01012345614','buyer','lead','facebook','950000']
  ];

  v_contracts text[][] := array[
    ['sale','1','4','4200000','1.25','100','completed','1','5'],
    ['sale','4','1','3600000','1','100','completed','2','4'],
    ['rent','7','5','240000','1','100','active','3','3'],
    ['sale','9','6','9500000','1.5','50','active','1','2'],
    ['sale','11','10','5250000','1','0','draft','2','1'],
    ['rent','13','13','360000','1','100','completed','3','4'],
    ['sale','15','11','2850000','1.25','100','completed','1','2'],
    ['rent','17','7','180000','1','60','cancelled','2','1'],
    ['sale','21','6','7400000','1','25','active','3','0']
  ];

  v_expenses text[][] := array[
    ['office_rent','18000','إيجار المكتب'],
    ['salaries','42000','مرتبات الموظفين'],
    ['utilities','3200','كهرباء وإنترنت'],
    ['marketing','7500','إعلانات فيسبوك و OLX'],
    ['transport','2600','مواصلات ومعاينات']
  ];

  v_prop_ids   uuid[] := '{}';
  v_client_ids uuid[] := '{}';
  v_stages     text[] := array['new','contacted','viewing','negotiation','won','lost'];

  i int;
  n int;
  v_idx int;
  v_purpose text;
  v_type text;
  v_area int;
  v_price numeric;
  v_status text;
  v_fin text;
  v_rooms int;
  v_per_meter numeric;
  v_pid uuid;
  v_cid uuid;
  v_row text[];
  v_commission numeric;
  v_paid numeric;
  v_months int;
  v_sign date;
  v_ct_id uuid;
  v_m int;
  v_label text[];
begin
  -- التأكد من وجود الحسابات
  select id into v_admin  from public.profiles where email = 'admin@realty.app';
  select id into v_sara   from public.profiles where email = 'sara@realty.app';
  select id into v_khaled from public.profiles where email = 'khaled@realty.app';
  select id into v_mona   from public.profiles where email = 'mona@realty.app';

  if v_admin is null or v_sara is null or v_khaled is null or v_mona is null then
    raise exception 'لم يتم العثور على كل الحسابات. أنشئ المستخدمين الأربعة من Authentication ثم شغّل الملف مرة أخرى.';
  end if;

  v_agents := array[v_sara, v_khaled, v_mona];

  if exists (select 1 from public.properties limit 1) then
    raise exception 'يوجد عقارات بالفعل في القاعدة — لن يتم إضافة بيانات تجريبية مكررة.';
  end if;

  -- 1) العملاء
  n := array_length(v_clients, 1);
  for i in 1..n loop
    v_row := v_clients[i];
    insert into public.clients (full_name, phone, kind, status, source, budget, assigned_to, created_at)
    values (
      v_row[1], v_row[2],
      v_row[3]::public.client_kind,
      v_row[4]::public.client_status,
      v_row[5]::public.client_source,
      nullif(v_row[6]::numeric, 0),
      v_agents[(i % 3) + 1],
      now() - (interval '1 day' * (5 + i * 9))
    )
    returning id into v_cid;
    v_client_ids := v_client_ids || v_cid;
  end loop;

  -- 2) العقارات
  for i in 1..25 loop
    v_idx     := ((i - 1) % 14) + 1;
    v_type    := v_types[((i - 1) % 12) + 1];
    v_purpose := case when i % 3 = 0 then 'rent' else 'sale' end;
    v_fin     := v_finish[((i - 1) % 5) + 1];
    v_area    := case
                   when v_type = 'land' then 200 + i * 45
                   when v_type = 'villa' then 280 + i * 15
                   when v_type = 'warehouse' then 400 + i * 30
                   else 70 + ((i * 17) % 180)
                 end;
    v_per_meter := case v_type
                     when 'apartment' then 16000
                     when 'duplex'    then 20000
                     when 'villa'     then 28000
                     when 'studio'    then 18000
                     when 'land'      then 6500
                     when 'shop'      then 45000
                     when 'office'    then 22000
                     when 'building'  then 14000
                     when 'warehouse' then 5000
                     else 1200
                   end;
    v_price := round(
      v_area * v_per_meter * (0.8 + ((i - 1) % 5) * 0.1)
      * case when v_purpose = 'rent' then 0.0055 else 1 end
    );
    v_price := round(v_price / 1000) * 1000;
    v_status := case
                  when i % 7 = 0 then 'sold'
                  when i % 9 = 0 then 'rented'
                  when i % 11 = 0 then 'reserved'
                  when i % 13 = 0 then 'off_market'
                  else 'available'
                end;
    v_rooms := case
                 when v_type in ('land','warehouse') then null
                 when v_type = 'villa' then 4 + (i % 2)
                 else 1 + (i % 4)
               end;

    insert into public.properties (
      ref_code, title, description, purpose, type, status,
      area_sqm, bedrooms, bathrooms, floor_no, total_floors, finishing,
      price, rent_period, governorate, district, address,
      owner_name, owner_phone, agent_id, featured, created_by, created_at, updated_at
    ) values (
      'PR-' || (1000 + i),
      case v_type
        when 'land' then 'أرض ' || v_area || ' م في ' || v_distr[v_idx]
        when 'villa' then 'فيلا ' || v_area || ' م ' || v_distr[v_idx]
        else (case v_type
                when 'apartment' then 'شقة'
                when 'duplex' then 'دوبلكس'
                when 'studio' then 'ستوديو'
                when 'shop' then 'محل'
                when 'office' then 'مكتب إداري'
                when 'building' then 'عمارة'
                when 'warehouse' then 'مخزن'
                else 'وحدة'
              end) || ' ' || v_area || ' م — ' || v_distr[v_idx]
      end,
      'وحدة بمساحة ' || v_area || ' متر في ' || v_distr[v_idx] || '، ' || v_govs[v_idx] || '. قريبة من الخدمات والمواصلات.',
      v_purpose::public.property_purpose,
      v_type::public.property_type,
      v_status::public.property_status,
      v_area, v_rooms, case when v_rooms is null then null else greatest(1, v_rooms / 2) end,
      case when v_type in ('land','villa') then null else 1 + (i % 12) end,
      case when v_type in ('land','villa') then null else 6 + (i % 8) end,
      case when v_type = 'land' then null else v_fin::public.finishing_type end,
      v_price,
      case when v_purpose = 'rent' then 'monthly' else null end,
      v_govs[v_idx], v_distr[v_idx],
      v_distr[v_idx] || '، شارع ' || (10 + i) || '، ' || v_govs[v_idx],
      v_owners[((i - 1) % 10) + 1],
      '011' || lpad((10000000 + i * 1234)::text, 8, '0'),
      v_agents[(i % 3) + 1],
      (i % 5 = 0),
      v_agents[(i % 3) + 1],
      now() - (interval '1 day' * (2 + i * 5)),
      now() - (interval '1 day' * (i * 2))
    ) returning id into v_pid;

    v_prop_ids := v_prop_ids || v_pid;
  end loop;

  -- 3) المتابعات
  for i in 1..20 loop
    insert into public.leads (client_id, property_id, stage, next_followup_at, notes, owner_id, created_at, updated_at)
    values (
      v_client_ids[((i - 1) % array_length(v_client_ids, 1)) + 1],
      v_prop_ids[((i - 1) % 25) + 1],
      v_stages[((i - 1) % 6) + 1]::public.lead_stage,
      current_date + (case when i % 5 = 0 then -2 when i % 3 = 0 then 0 else (i % 7) + 1 end),
      case when i % 4 = 0 then 'العميل طلب معاينة تانية نهاية الأسبوع.'
           when i % 4 = 1 then 'مهتم بالسعر، محتاج تفاوض مع المالك.'
           else null end,
      v_agents[(i % 3) + 1],
      now() - (interval '1 day' * (1 + i * 3)),
      now() - (interval '1 day' * i)
    );
  end loop;

  -- 4) العقود
  for i in 1..array_length(v_contracts, 1) loop
    v_row        := v_contracts[i];
    v_months     := v_row[9]::int;
    v_sign       := (date_trunc('month', current_date) - (v_months || ' months')::interval)::date;
    v_commission := round(v_row[4]::numeric * v_row[5]::numeric / 100, 2);
    v_paid       := round(v_commission * v_row[6]::numeric / 100, 2);

    insert into public.contracts (
      contract_no, type, property_id, client_id,
      total_amount, commission_rate, commission_amount, paid_amount,
      status, sign_date, start_date, end_date, agent_id, created_at
    ) values (
      'CNT-' || (2025000 + i),
      v_row[1]::public.contract_type,
      v_prop_ids[v_row[2]::int],
      v_client_ids[v_row[3]::int],
      v_row[4]::numeric, v_row[5]::numeric, v_commission, v_paid,
      v_row[7]::public.contract_status,
      v_sign, v_sign,
      case when v_row[1] = 'rent' then (v_sign + interval '12 months')::date else null end,
      v_agents[v_row[8]::int],
      now() - (interval '1 day' * (v_months * 30 + 2))
    ) returning id into v_ct_id;

    -- قيد الإيراد الناتج عن العمولة المسددة
    if v_paid > 0 and v_row[7] <> 'cancelled' then
      insert into public.transactions (kind, category, amount, description, tx_date, contract_id, created_by, created_at)
      values (
        'income',
        case when v_row[1] = 'rent' then 'rent_collection'::public.tx_category else 'commission'::public.tx_category end,
        v_paid,
        'عمولة عقد CNT-' || (2025000 + i),
        v_sign, v_ct_id, v_admin,
        now() - (interval '1 day' * (v_months * 30 + 2))
      );
    end if;
  end loop;

  -- 5) المصروفات الشهرية (آخر 6 شهور) + إيراد إضافي
  for v_m in 0..5 loop
    for i in 1..array_length(v_expenses, 1) loop
      v_row   := v_expenses[i];
      v_label := array[
        (date_trunc('month', current_date) - (v_m || ' months')::interval)::date + ((2 + i) || ' days')::interval
      ];
      insert into public.transactions (kind, category, amount, description, tx_date, created_by, created_at)
      values (
        'expense',
        v_row[1]::public.tx_category,
        round(v_row[2]::numeric * (0.85 + ((v_m + i) % 5) * 0.08), 0),
        v_row[3] || ' — ' || to_char(v_label[1]::date, 'YYYY/MM'),
        v_label[1]::date,
        v_admin,
        v_label[1]::timestamptz
      );
    end loop;

    insert into public.transactions (kind, category, amount, description, tx_date, created_by, created_at)
    values (
      'income', 'other_income', 5000 + v_m * 2500,
      'خدمات واستشارات عقارية',
      ((date_trunc('month', current_date) - (v_m || ' months')::interval)::date + interval '15 days')::date,
      v_admin,
      now() - (interval '1 day' * (v_m * 30 + 15))
    );
  end loop;

  -- 6) بيانات المكتب
  update public.office_settings
     set name = 'Realty Office', city = 'القاهرة', phone = '+20 100 000 0000',
         email = 'info@realty-office.com'
   where id = true;

  raise notice 'تم إضافة البيانات التجريبية: 14 عميل، 25 عقار، 20 متابعة، 9 عقود + الحركات المالية.';
end $$;

select
  (select count(*) from public.clients)      as clients,
  (select count(*) from public.properties)   as properties,
  (select count(*) from public.leads)        as leads,
  (select count(*) from public.contracts)    as contracts,
  (select count(*) from public.transactions) as transactions;
